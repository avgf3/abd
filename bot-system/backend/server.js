const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// قاعدة البيانات
const dbPath = path.join(__dirname, '../database/bots.db');
const db = new sqlite3.Database(dbPath);

// نقاط النهاية (Endpoints)

// الحصول على جميع الأعضاء
app.get('/api/members', (req, res) => {
    const { room, status } = req.query;
    let query = 'SELECT * FROM members WHERE 1=1';
    const params = [];
    
    if (room) {
        query += ' AND current_room = ?';
        params.push(room);
    }
    
    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }
    
    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// الحصول على جميع الغرف
app.get('/api/rooms', (req, res) => {
    db.all('SELECT * FROM rooms', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// الحصول على إحصائيات الغرف
app.get('/api/rooms/stats', (req, res) => {
    const query = `
        SELECT 
            r.id,
            r.name,
            r.description,
            r.max_members,
            COUNT(m.id) as current_members
        FROM rooms r
        LEFT JOIN members m ON m.current_room = r.name
        GROUP BY r.id, r.name, r.description, r.max_members
    `;
    
    db.all(query, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// نقل عضو إلى غرفة
app.post('/api/members/:id/move', (req, res) => {
    const { id } = req.params;
    const { room } = req.body;
    
    // الحصول على الغرفة الحالية
    db.get('SELECT current_room FROM members WHERE id = ?', [id], (err, member) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (!member) {
            res.status(404).json({ error: 'العضو غير موجود' });
            return;
        }
        
        const fromRoom = member.current_room;
        
        // تحديث الغرفة
        db.run('UPDATE members SET current_room = ? WHERE id = ?', [room, id], (err) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            // تسجيل الحركة
            db.run('INSERT INTO movement_logs (member_id, from_room, to_room) VALUES (?, ?, ?)',
                [id, fromRoom, room], (err) => {
                    if (err) {
                        console.error('خطأ في تسجيل الحركة:', err);
                    }
                });
            
            res.json({ success: true, from: fromRoom, to: room });
        });
    });
});

// نقل مجموعة من الأعضاء
app.post('/api/members/move-batch', (req, res) => {
    const { memberIds, targetRoom } = req.body;
    
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
        res.status(400).json({ error: 'يجب تحديد أعضاء للنقل' });
        return;
    }
    
    const placeholders = memberIds.map(() => '?').join(',');
    const updateQuery = `UPDATE members SET current_room = ? WHERE id IN (${placeholders})`;
    
    db.run(updateQuery, [targetRoom, ...memberIds], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            // تسجيل الحركات
            memberIds.forEach(memberId => {
                db.run('INSERT INTO movement_logs (member_id, to_room) VALUES (?, ?)',
                    [memberId, targetRoom]);
            });
            
            res.json({ success: true, moved: this.changes });
        }
    });
});

// نقل جميع الأعضاء من غرفة إلى أخرى
app.post('/api/rooms/move-all', (req, res) => {
    const { fromRoom, toRoom } = req.body;
    
    // الحصول على جميع الأعضاء في الغرفة المصدر
    db.all('SELECT id FROM members WHERE current_room = ?', [fromRoom], (err, members) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (members.length === 0) {
            res.json({ success: true, moved: 0 });
            return;
        }
        
        // نقل جميع الأعضاء
        db.run('UPDATE members SET current_room = ? WHERE current_room = ?', [toRoom, fromRoom], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                // تسجيل الحركات
                members.forEach(member => {
                    db.run('INSERT INTO movement_logs (member_id, from_room, to_room) VALUES (?, ?, ?)',
                        [member.id, fromRoom, toRoom]);
                });
                
                res.json({ success: true, moved: this.changes });
            }
        });
    });
});

// الحصول على سجل الحركات
app.get('/api/logs', (req, res) => {
    const query = `
        SELECT 
            l.id,
            l.member_id,
            m.display_name,
            m.username,
            l.from_room,
            l.to_room,
            l.timestamp
        FROM movement_logs l
        JOIN members m ON m.id = l.member_id
        ORDER BY l.timestamp DESC
        LIMIT 100
    `;
    
    db.all(query, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// تحديث حالة العضو
app.patch('/api/members/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['online', 'offline', 'busy'].includes(status)) {
        res.status(400).json({ error: 'حالة غير صالحة' });
        return;
    }
    
    db.run('UPDATE members SET status = ? WHERE id = ?', [status, id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ success: true, updated: this.changes });
        }
    });
});

// بدء الخادم
app.listen(PORT, () => {
    console.log(`الخادم يعمل على http://localhost:${PORT}`);
    console.log(`لوحة الإدارة متاحة على http://localhost:${PORT}/admin`);
});