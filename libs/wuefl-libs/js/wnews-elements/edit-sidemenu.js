import sidemenu from "../menu.js";

export default class WnSideMenu extends HTMLElement {
    connectedCallback() {
        this.insertAdjacentHTML("afterbegin", `
            <!-- Seitenmenu -->
            <aside class="sidemenu" data-set="left" type="close">
                <div class="sidemenu_content">
                    <div class="vertical sidemenu_main_content">
                        <header class="vertical">
                            <a class="button" href="" login full>Login</a>
                            <a class="button" href="" logout full>Logout</a>
                            <a href="../../index.html" dashboard >Startseite</a>
                        </header>
                        <section class="vertical">
                            <p class="heading-2">Navigation</p>
                            <a class="sub_menu_item" hhref="index.html">Aktuell</a>
                            <a class="sub_menu_item" hhref="html/newspaper.html">KLEINgedrucktes</a>
                            <a class="sub_menu_item" hhref="html/schoolnews.html">Schulnews</a>
                        </section>
                    </div>
                    <footer class="vertical">
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