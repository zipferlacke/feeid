export default class WnMobileNavigation extends HTMLElement {
    connectedCallback() {
        this.insertAdjacentHTML("afterbegin", `
            <!-- Mobile Navigation -->
            <nav class="mobile_navigation" mobile>
                <a class="fs-100 sidemenu_controll">
                    <span class="msr">menu</span>
                    Menu
                </a>           
                <a class="fs-100" hhref="index.html">
                    <span class="msr">home</span>
                    Startseite
                </a>

                <a class="fs-100" hhref="html/articles_dashboard.html">
                    <span class="msr active">grid_view</span>
                    Artikel
                </a>
                
                <a class="fs-100" hhref="html/display_dashboard.html">
                    <span class="msr">display_settings</span>
                    Display
                </a>
            </nav>
        `);

        // Basissurl wird geladen
        let baseUrl = document.location.href.split('/').slice(0, 3).join('/');
        if(baseUrl == "https://app.wuefl.de") baseUrl +="/wnews";
        //Links werden an das import file angepasst.
        this.querySelectorAll("[hhref]").forEach((url) => {
            url.href = baseUrl + "/" + url.getAttribute("hhref");
            url.removeAttribute("hhref");
        });

        this.querySelectorAll("a span")[parseInt(this.dataset.active)].setAttribute("active", "");
        
        this.replaceWith(this.firstElementChild);
    }
}