export default function sidemenu(){
    //=========================================
    // Login
    //=========================================

    const login = document.querySelector("a[login]");
    const logout = document.querySelector("a[logout]");
    const dashboard = document.querySelector("a[dashboard]");

    function loadLoginNav(){
        if(document.cookie.indexOf('user_uuid=') == -1){
            logout.setAttribute("type", "close");
            dashboard.setAttribute("type", "close");
            login.removeAttribute("type");
        }else{
            login.setAttribute("type", "close");
            logout.removeAttribute("type");
            dashboard.removeAttribute("type");
        }
    }
    loadLoginNav();

    login.addEventListener("click", async function (e) {
        e.preventDefault();
        let baseUrl = document.location.href.split('/').slice(0, 3).join('/');
        if(baseUrl == "https://app.wuefl.de") baseUrl +="/wnews";
        window.location.href=baseUrl+'/api/login.php';

        //await dataConnection(urlComUser, ["signin"]);    
    });

    logout.addEventListener("click", async function(e){
        e.preventDefault();
        await dataConnection(urlComUser, ["signout"]);
        document.cookie = "user_uuid=John Doe; expires=Thu, 18 Dec 2013 12:00:00 UTC; path=/";
        loadLoginNav();
    });
}