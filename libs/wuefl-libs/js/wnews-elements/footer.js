export default class WnFooter extends HTMLElement {
    connectedCallback() {
        this.insertAdjacentHTML("afterbegin", `
            <!-- Footer -->
            <footer class="footer">
                <div class="vertical powerdby" normal>
                    <p>Engineered by</p>
                    <p class="heading-2">&copy; wuefl</p>
                </div>
                <nav class="nav wrapper" narrow>
                    <a hhref="html/impressum.html">Impressum</a>
                    <a hhref="html/datenschutz.html">Datenschutz</a>
                </nav>
            </footer>
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
    }
}