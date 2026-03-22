export default class WnHeader extends HTMLElement {
    connectedCallback() {
        this.insertAdjacentHTML("afterbegin", `
            <!-- Header -->
            <header class="header box-shadow-300" full>
                <div class="wrapper">
                    <div class="header_inline" normal type="columnsLeft">
                        <div class="header_logo header_categorie" left>
                            <img class="img" ssrc="defaults/icons/fkg.svg" alt="FKG-News">
                        </div>
                        <div class="sidemenu_controll" right>
                            <button class="button button__sidemenu_open" data-set="round"><span class="msr">menu</span></button>
                        </div>
                    </div>
                </div>
                
                <div class="wrapper bg-white header_nav">
                    <nav class="nav">
                        <a class="sub_menu_item" hhref="index.html">Aktuell</a>
                        <a class="sub_menu_item" hhref="html/newspaper.html">KLEINgedrucktes</a>
                        <a class="sub_menu_item" hhref="html/schoolnews.html">Schulnews</a>
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