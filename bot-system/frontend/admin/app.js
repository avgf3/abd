// عنوان API
const API_URL = 'http://localhost:3000/api';

// متغيرات عامة
let allMembers = [];
let rooms = [];
let selectedMembers = new Set();

// تحميل البيانات عند بدء التطبيق
document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadRooms();
    loadLogs();
    
    // تحديث البيانات كل 5 ثواني
    setInterval(() => {
        loadStats();
        loadRooms();
        loadLogs();
    }, 5000);
});

// تحميل الإحصائيات
async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/members`);
        const members = await response.json();
        
        const stats = {
            total: members.length,
            online: members.filter(m => m.status === 'online').length,
            busy: members.filter(m => m.status === 'busy').length,
            offline: members.filter(m => m.status === 'offline').length
        };
        
        document.getElementById('totalMembers').textContent = stats.total;
        document.getElementById('onlineMembers').textContent = stats.online;
        document.getElementById('busyMembers').textContent = stats.busy;
        document.getElementById('offlineMembers').textContent = stats.offline;
        
        allMembers = members;
    } catch (error) {
        console.error('خطأ في تحميل الإحصائيات:', error);
    }
}

// تحميل الغرف
async function loadRooms() {
    try {
        const response = await fetch(`${API_URL}/rooms/stats`);
        rooms = await response.json();
        
        const roomsGrid = document.getElementById('roomsGrid');
        roomsGrid.innerHTML = rooms.map(room => `
            <div class="room-card" onclick="selectRoom('${room.name}')">
                <div class="room-name">${room.name}</div>
                <div class="room-info">
                    <span>${room.description || ''}</span>
                    <span class="member-count">${room.current_members} / ${room.max_members}</span>
                </div>
            </div>
        `).join('');
        
        // تحديث قوائم الاختيار
        updateRoomSelects();
    } catch (error) {
        console.error('خطأ في تحميل الغرف:', error);
    }
}

// تحديث قوائم اختيار الغرف
function updateRoomSelects() {
    const roomOptions = rooms.map(room => 
        `<option value="${room.name}">${room.name} (${room.current_members} عضو)</option>`
    ).join('');
    
    document.getElementById('fromRoom').innerHTML = '<option value="">اختر غرفة</option>' + roomOptions;
    document.getElementById('toRoom').innerHTML = '<option value="">اختر غرفة</option>' + roomOptions;
    document.getElementById('sourceRoom').innerHTML = '<option value="">اختر غرفة</option>' + roomOptions;
    document.getElementById('targetRoom').innerHTML = '<option value="">اختر غرفة</option>' + roomOptions;
}

// اختيار غرفة
function selectRoom(roomName) {
    document.getElementById('sourceRoom').value = roomName;
    loadRoomMembers();
}

// تحميل أعضاء الغرفة
async function loadRoomMembers() {
    const roomName = document.getElementById('sourceRoom').value;
    if (!roomName) {
        document.getElementById('membersList').innerHTML = '';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/members?room=${roomName}`);
        const members = await response.json();
        
        const membersList = document.getElementById('membersList');
        membersList.innerHTML = members.map(member => `
            <div class="member-item">
                <input type="checkbox" class="member-checkbox" 
                       value="${member.id}" 
                       onchange="toggleMember(${member.id})">
                <img src="${member.avatar_url}" alt="" class="member-avatar">
                <span class="member-name">${member.display_name}</span>
                <span class="status-${member.status}">${getStatusText(member.status)}</span>
            </div>
        `).join('');
        
        selectedMembers.clear();
    } catch (error) {
        console.error('خطأ في تحميل الأعضاء:', error);
    }
}

// تبديل تحديد العضو
function toggleMember(memberId) {
    if (selectedMembers.has(memberId)) {
        selectedMembers.delete(memberId);
    } else {
        selectedMembers.add(memberId);
    }
}

// نقل جميع الأعضاء
async function moveAllMembers() {
    const fromRoom = document.getElementById('fromRoom').value;
    const toRoom = document.getElementById('toRoom').value;
    
    if (!fromRoom || !toRoom) {
        showAlert('يرجى اختيار الغرف', 'error');
        return;
    }
    
    if (fromRoom === toRoom) {
        showAlert('لا يمكن النقل إلى نفس الغرفة', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/rooms/move-all`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fromRoom, toRoom })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(`تم نقل ${result.moved} عضو بنجاح`, 'success');
            loadStats();
            loadRooms();
            loadLogs();
        } else {
            showAlert('حدث خطأ في النقل', 'error');
        }
    } catch (error) {
        console.error('خطأ:', error);
        showAlert('حدث خطأ في النقل', 'error');
    }
}

// نقل الأعضاء المحددين
async function moveSelectedMembers() {
    const targetRoom = document.getElementById('targetRoom').value;
    
    if (selectedMembers.size === 0) {
        showAlert('يرجى اختيار أعضاء للنقل', 'error');
        return;
    }
    
    if (!targetRoom) {
        showAlert('يرجى اختيار الغرفة المستهدفة', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/members/move-batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                memberIds: Array.from(selectedMembers),
                targetRoom
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(`تم نقل ${result.moved} عضو بنجاح`, 'success');
            loadStats();
            loadRooms();
            loadRoomMembers();
            loadLogs();
            selectedMembers.clear();
        } else {
            showAlert('حدث خطأ في النقل', 'error');
        }
    } catch (error) {
        console.error('خطأ:', error);
        showAlert('حدث خطأ في النقل', 'error');
    }
}

// تحميل سجل الحركات
async function loadLogs() {
    try {
        const response = await fetch(`${API_URL}/logs`);
        const logs = await response.json();
        
        const logsContainer = document.getElementById('logsContainer');
        logsContainer.innerHTML = logs.map(log => {
            const time = new Date(log.timestamp).toLocaleString('ar-SA');
            return `
                <div class="log-item">
                    <div class="log-info">
                        <strong>${log.display_name}</strong>
                        ${log.from_room || 'غير محدد'} 
                        <span class="movement-arrow">←</span>
                        ${log.to_room || 'غير محدد'}
                    </div>
                    <div class="log-time">${time}</div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('خطأ في تحميل السجلات:', error);
    }
}

// الحصول على نص الحالة
function getStatusText(status) {
    const statusMap = {
        'online': 'متصل',
        'offline': 'غير متصل',
        'busy': 'مشغول'
    };
    return statusMap[status] || status;
}

// عرض رسالة تنبيه
function showAlert(message, type) {
    const alert = document.createElement('div');
    alert.className = `alert ${type}`;
    alert.textContent = message;
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 3000);
}