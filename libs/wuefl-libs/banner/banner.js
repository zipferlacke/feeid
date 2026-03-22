//====================================================================
// Pop-up Notification
//====================================================================
let checkInterval = null;


/**
 * ShowBanner - Popup
 * @param {string} content
 * @param {"info"|"success"|"warning"|"error"} type
 * @param {number} duration
 */
export function showBanner(content, type, duration=5000){
    injectCss();
    const validTypes = ["info", "success", "warning", "error"];
    if (!type in validTypes) {
        throw `showAlert(): type must be: "${validTypes.join("|")}"`;
    }
    
    let notification_wrapper = document.querySelector("#notification_wrapper"); 
    if (!notification_wrapper) {
        const popup = `<dialog open id="notification_wrapper" popover="manual"></dialog>`
        document.body.insertAdjacentHTML("beforeend", popup);
        notification_wrapper = document.querySelector("#notification_wrapper")
    }

    if (!notification_wrapper.matches(':popover-open')) {
        notification_wrapper.showPopover();
    }


   const icons = {
        error: `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm0-160q17 0 28.5-11.5T520-480v-160q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640v160q0 17 11.5 28.5T480-440Zm0 360q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>`,
        warning: `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M109-120q-11 0-20-5.5T75-140q-5-9-5.5-19.5T75-180l370-640q6-10 15.5-15t19.5-5q10 0 19.5 5t15.5 15l370 640q6 10 5.5 20.5T885-140q-5 9-14 14.5t-20 5.5H109Zm69-80h604L480-720 178-200Zm302-40q17 0 28.5-11.5T520-280q0-17-11.5-28.5T480-320q-17 0-28.5 11.5T440-280q0 17 11.5 28.5T480-240Zm0-120q17 0 28.5-11.5T520-400v-120q0-17-11.5-28.5T480-560q-17 0-28.5 11.5T440-520v120q0 17 11.5 28.5T480-360Zm0-100Z"/></svg>`,
        success: `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="m382-354 339-339q12-12 28.5-12t28.5 12q12 12 12 28.5T778-636L410-268q-12 12-28 12t-28-12L182-440q-12-12-11.5-28.5T183-497q12-12 28.5-12t28.5 12l142 143Z"/></svg>`,
        info:`<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#1f1f1f"><path d="M440-280h80v-240h-80v240Zm40-320q17 0 28.5-11.5T520-640q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640q0 17 11.5 28.5T480-600Zm0 520q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>`,
        close: `<svg xmlns="http://www.w3.org/2000/svg" height="48" viewBox="0 -960 960 960" width="48"><path d="M480-438 270-228q-9 9-21 9t-21-9q-9-9-9-21t9-21l210-210-210-210q-9-9-9-21t9-21q9-9 21-9t21 9l210 210 210-210q9-9 21-9t21 9q9 9 9 21t-9 21L522-480l210 210q9 9 9 21t-9 21q-9 9-21 9t-21-9L480-438Z"/></svg>`
    };
    
    // 4. Notification HTML
    const expiryTime = Date.now() + duration;
    const notificationHtml = `
        <div class="notification" data-expiry="${expiryTime}" data-type="${type}"> 
            <div class="notification_icon">${icons[type] || ''}</div>
            <p class="notification_msg">${content}</p> 
            <button onclick="this.parentElement.remove()" class="notification_close">
                ${icons.close}
            </button>
        </div>
    `;
    notification_wrapper.insertAdjacentHTML("afterbegin", notificationHtml);

    // 5. Timer starten falls nicht aktiv
    if (!checkInterval) {
        checkInterval = setInterval(checkNotifications, 500);
    }
}



function checkNotifications() {
    const notification_wrapper = document.querySelector("#notification_wrapper");
    if (!notification_wrapper) return;

    const notifications = notification_wrapper.querySelectorAll(".notification");
    const now = Date.now();

    notifications.forEach(n => {
        if (now > parseInt(n.dataset.expiry)) {
            n.remove();
        }
    });

    // Wenn leer: Interval stoppen und Popover schließen
    if (notification_wrapper.querySelectorAll(".notification").length === 0) {
        clearInterval(checkInterval);
        checkInterval = null;
        notification_wrapper.hidePopover();
    }
}

function injectCss(){
    const cssUrl = new URL('./banner.css', import.meta.url);
    if (document.querySelector(`link[href="${cssUrl.href}"]`)) return; 
    const cssLink = `<link rel="stylesheet" href="${cssUrl.href}">`;
    document.head.insertAdjacentHTML("beforeend", cssLink);
}