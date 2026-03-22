// ===================================
// Import
// ===================================

// HTML-Templates
import WnHeader from "./edit-header.js";
import WnMobileNavigation from "./edit-mobile-navigation.js";
import WnSideMenu from "./edit-sidemenu.js";
import WnFooter from "./footer.js";

// Systemdialoge
// import { cconfirm } from "../confirm.js";

// ====================================
// Inizialiserung
// ====================================

// HTML-Templates 
customElements.define("wn-header-edit", WnHeader);
customElements.define("wn-mobile-navigation-edit", WnMobileNavigation);
customElements.define("wn-sidemenu-edit", WnSideMenu);
customElements.define("wn-footer", WnFooter);

async function loaddata(){
    // Leute mit alten Browsern werden aufgefordert ihren Browser zu aktualisieren
    if(!CSS.supports("selector(&)")){
        await cconfirm({
            title:"Browser aktualiseren", 
            message:"Sie nutzen eine <b>veraltete Browserversion</b>... <br>Bitte aktaulisieren sie für eine bessere Seitenerfahrung und ihr Sicherheit ihren Browser. <br>Bei <b>Apple-Geräten</b> muss dafür das Betribsystem aktualisiert werden, <b>mindestens auf IOS/IPadOS 16.6!</b>. Bei Android und Windows muss die App/das Programm nur aktualisiert werden.<br>Sie können die Seite momentan nur sehr eingeschränkt nutzen :) !<br>Bei Fragen wenden Sie sich gerne an Herrn Jansen, er steht ihnen gerne Zurverfügung!",
            confirmButtonText: "Verstanden ich kümmere mich ...",
            type: "error",
            canCancel: false
        });
    }
}

loaddata();
