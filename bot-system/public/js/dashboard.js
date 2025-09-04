// وظائف عامة للوحة التحكم

// عرض رسالة التنبيه
function showNotification(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    alertDiv.style.zIndex = '9999';
    alertDiv.style.minWidth = '300px';
    alertDiv.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas fa-${getAlertIcon(type)} me-2"></i>
            <div>${message}</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    
    // إضافة تأثير الظهور
    setTimeout(() => {
        alertDiv.classList.add('show');
    }, 10);
    
    // إزالة التنبيه تلقائياً بعد 5 ثواني
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 150);
    }, 5000);
}

// الحصول على أيقونة التنبيه
function getAlertIcon(type) {
    const icons = {
        'success': 'check-circle',
        'danger': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// تنسيق التاريخ والوقت
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// تنسيق الأرقام
function formatNumber(num) {
    return new Intl.NumberFormat('ar-SA').format(num);
}

// طلب API عام
async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success && data.error) {
            throw new Error(data.error);
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        showNotification(error.message || 'حدث خطأ في الطلب', 'danger');
        throw error;
    }
}

// تحديث العنصر بتأثير
function updateElementWithAnimation(elementId, newValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.style.transition = 'opacity 0.3s';
    element.style.opacity = '0.5';
    
    setTimeout(() => {
        element.textContent = newValue;
        element.style.opacity = '1';
    }, 300);
}

// إضافة مؤشر التحميل
function showLoader(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.innerHTML = '<div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">جاري التحميل...</span></div>';
}

// إخفاء مؤشر التحميل
function hideLoader(elementId, content) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.innerHTML = content;
}

// تحديث حالة الاتصال
let connectionStatusElement = null;

function updateConnectionStatus(connected) {
    if (!connectionStatusElement) {
        connectionStatusElement = document.createElement('div');
        connectionStatusElement.className = 'connection-status';
        document.body.appendChild(connectionStatusElement);
    }
    
    if (connected) {
        connectionStatusElement.className = 'connection-status connected';
        connectionStatusElement.innerHTML = '<i class="fas fa-check-circle"></i> متصل';
        setTimeout(() => {
            connectionStatusElement.style.display = 'none';
        }, 3000);
    } else {
        connectionStatusElement.className = 'connection-status disconnected';
        connectionStatusElement.innerHTML = '<i class="fas fa-times-circle"></i> غير متصل';
        connectionStatusElement.style.display = 'block';
    }
}

// معالج نسخ النص
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('تم النسخ إلى الحافظة', 'success');
        }).catch(err => {
            console.error('فشل النسخ:', err);
        });
    } else {
        // طريقة بديلة للمتصفحات القديمة
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            showNotification('تم النسخ إلى الحافظة', 'success');
        } catch (err) {
            console.error('فشل النسخ:', err);
        }
        
        document.body.removeChild(textArea);
    }
}

// تصدير البيانات
function exportData(data, filename) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showNotification('تم تصدير البيانات بنجاح', 'success');
}

// تأكيد الإجراءات الخطرة
function confirmAction(message, onConfirm) {
    if (confirm(message)) {
        onConfirm();
    }
}

// تهيئة tooltips
document.addEventListener('DOMContentLoaded', () => {
    // تهيئة Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    
    // تهيئة popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));
    
    // إضافة تأثير التحميل للنماذج
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function() {
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>جاري المعالجة...';
            }
        });
    });
});

// معالج الأخطاء العام
window.addEventListener('error', (event) => {
    console.error('خطأ عام:', event.error);
    showNotification('حدث خطأ غير متوقع', 'danger');
});

// معالج رفض الوعود
window.addEventListener('unhandledrejection', (event) => {
    console.error('وعد مرفوض:', event.reason);
    showNotification('حدث خطأ في معالجة الطلب', 'danger');
});

// وظائف مساعدة للرسوم البيانية (إذا تم استخدام Chart.js)
function createChart(elementId, type, data, options = {}) {
    const ctx = document.getElementById(elementId);
    if (!ctx) return null;
    
    return new Chart(ctx, {
        type: type,
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            ...options
        }
    });
}

// تحديث الرسم البياني
function updateChart(chart, newData) {
    if (!chart) return;
    
    chart.data = newData;
    chart.update();
}

// وظيفة البحث في الجداول
function searchTable(inputId, tableId) {
    const input = document.getElementById(inputId);
    const table = document.getElementById(tableId);
    
    if (!input || !table) return;
    
    input.addEventListener('keyup', function() {
        const filter = this.value.toLowerCase();
        const rows = table.getElementsByTagName('tr');
        
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const cells = row.getElementsByTagName('td');
            let found = false;
            
            for (let j = 0; j < cells.length; j++) {
                const cell = cells[j];
                if (cell.textContent.toLowerCase().indexOf(filter) > -1) {
                    found = true;
                    break;
                }
            }
            
            row.style.display = found ? '' : 'none';
        }
    });
}

// تحديث الوقت المنقضي
function updateElapsedTime() {
    document.querySelectorAll('[data-elapsed-time]').forEach(element => {
        const timestamp = element.getAttribute('data-elapsed-time');
        const elapsed = getElapsedTime(new Date(timestamp));
        element.textContent = elapsed;
    });
}

// حساب الوقت المنقضي
function getElapsedTime(date) {
    const now = new Date();
    const diff = now - date;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `منذ ${days} يوم`;
    if (hours > 0) return `منذ ${hours} ساعة`;
    if (minutes > 0) return `منذ ${minutes} دقيقة`;
    return `منذ ${seconds} ثانية`;
}

// تحديث الوقت المنقضي كل دقيقة
setInterval(updateElapsedTime, 60000);

// تصدير الوظائف للاستخدام العام
window.dashboardUtils = {
    showNotification,
    formatDateTime,
    formatNumber,
    apiRequest,
    updateElementWithAnimation,
    showLoader,
    hideLoader,
    copyToClipboard,
    exportData,
    confirmAction,
    createChart,
    updateChart,
    searchTable
};