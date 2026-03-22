export default class WnHeader extends HTMLElement {
    connectedCallback() {
        this.insertAdjacentHTML("afterbegin", `
            <!-- Header -->
            <header class="header box-shadow-300" full>
                <div class="wrapper">
                    <div class="header_inline" normal type="columnsLeft">
                        <div class="header_logo" left>
                            <a href="../../index.html" style="display: block; width: 100%; height: 100%;">
                                <img class="img" src="../defaults/icons/fkg.svg" alt="FKG-News">
                            </a>
                        </div>
                        <div class="sidemenu_controll" right computer>
                            <button class="button" data-set="round"><span class="msr">menu</span></button>
                        </div>
                    </div>
                </div>
                <div class="wrapper bg-white header_nav">
                    <nav class="nav">
                        <a class="sub_menu_item" hhref="#wait_release">Eingereichte Artikel</a>
                        <a class="sub_menu_item" hhref="#progress">Artikel in Bearbeitung</a>
                        <a class="sub_menu_item" hhref="#published">Veröffentlichte Artikel</a>
                        <a class="sub_menu_item display-settings" hhref="html/display_dashboard.html" computer><span class="msr">display_settings</span> Display</a>
                    </nav>
                </div>
            </header>
        `);

        // Basissurl wird geladen
        let baseUrl = document.location.href.split('/').slice(0, 3).join('/');
        if(baseUrl == "https://app.wuefl.de") baseUrl +="/wnews";

        //Links werden an das import file angepasst.
        this.querySelectorAll("[hhref]").forEach((url) => {
            url.href = baseUrl + "/" + url.getAttribute("hhref");
            url.removeAttribute("hhref");
        });

        this.querySelectorAll("[ssrc]").forEach((url) => {
            url.src = baseUrl + "/" + url.getAttribute("ssrc");
            url.removeAttribute("ssrc");
        });

        this.replaceWith(this.firstElementChild);
    }
}