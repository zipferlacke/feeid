import sidemenu from "../menu.js";

export default class WnSideMenu extends HTMLElement {
    connectedCallback() {
        this.insertAdjacentHTML("afterbegin", `
            <aside class="sidemenu" data-set="left" type="close">
                <div class="sidemenu_content">
                    <div class="vertical sidemenu_main_content">
                        <header class="vertical">

                            <a class="button" hhref="" login full>Login</a>
                            <a class="button" hhref="" logout full>Logout</a>
                            <a hhref="./html/articles_dashboard.html" dashboard>Dashboard</a>
                        </header>
                        <section class="vertical">
                            <div class="search_wrapper">
                                <input id="dialog_user_name" class="search__input" type="search" placeholder="Artikelname ...">
                                <div id="dialog_search_options" class="search__option_wrapper"></div>
                            </div>

                            <p class="heading-2">Navigation</p>
                            <a class="sub_menu_item" hhref="index.html">Aktuell</a>
                            <a class="sub_menu_item" hhref="html/newspaper.html">KLEINgedrucktes</a>
                            <a class="sub_menu_item" hhref="html/schoolnews.html">Schulnews</a>
                            <a class="sub_menu_item" hhref="html/archiv.html">Archiv</a>
                        </section>
                        <section class="vertical">
                            <p class="heading-2">Kategorien</p>
                            <div id="sidemenu_categories" class="vertical"></div>
                        </section>
                    </div>
                    <footer class="vertical">
                        <a class="sub_menu_item" hhref="html/impressum.html">Impressum</a>
                        <a class="sub_menu_item" hhref="html/datenschutz.html">Datenschutz</a>
                        <p></p>
                        <p>Engineered by</p>
                        <p class="fw-600">&copy; wuefl</p>
                    </footer>
                </div>
            </aside>
        `);

        // Basissurl wird geladen
        let baseUrl = document.location.href.split('/').slice(0, 3).join('/');
        if(baseUrl == "https://app.wuefl.de") baseUrl +="/wnews";

        //Links werden an das import file angepasst.
        this.querySelectorAll("[hhref]").forEach((url) => {
            url.href = baseUrl + "/" + url.getAttribute("hhref");
            url.removeAttribute("hhref");
        });

        this.replaceWith(this.firstElementChild);   

        const menuOpen = document.querySelectorAll(".sidemenu_controll");
        const menu = document.querySelector(".sidemenu");
        menuOpen.forEach(open => {
            open.addEventListener("click", function(){
                menu.removeAttribute("type");
            });
        });

        menu.addEventListener("click", function(e){
            if(!e.target.closest(".sidemenu_content")){
                menu.setAttribute("type", "close");
            }
        });

        sidemenu();
    }
}