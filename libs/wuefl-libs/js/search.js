function search_input(searchMap, standardSearch = true){

    const searchWrapper = document.querySelectorAll(".search_wrapper");
    searchWrapper.forEach(searchElm =>{
        const searchInput = searchElm.querySelector(".search__input");
        const optionWrapper = searchElm.querySelector(".search__option_wrapper")

        searchInput.value = "";
        
        searchInput.addEventListener("input", async function(e){
            let availableOptions = filter_searchlist(searchMap, e.target.value);
            build_search_options(optionWrapper, availableOptions, standardSearch);


            searchInput.parentElement.classList.add("active");

            if(standardSearch){
                let options = document.querySelectorAll(".search__option");
                options.forEach(option => {
                    option.addEventListener("click", function(e){
                        searchInput.value = e.currentTarget.innerText;
                        searchInput.setAttribute("data-value", e.currentTarget.getAttribute("value"));
                        option.parentElement.parentElement.classList.remove("active");
                    });
                });
            }
            
        });
        searchInput.addEventListener("click", function(){
            searchInput.parentElement.classList.add("active");
        });

        document.addEventListener("click", (e)=>{
            if(!e.target.closest(".search_wrapper")){
                searchInput.parentElement.classList.remove("active");
            }
        }); 
    });
    
}

function build_search_options(optionWrapper, search_list, standardSearch){
    optionWrapper.innerHTML = "";

    if(search_list.length != 0){
        if(standardSearch){
            search_list.forEach((optionData) => {
                let option = document.createElement("p");
                option.setAttribute("class", "search__option");
                option.setAttribute("value", optionData["value"]);
                option.innerText = optionData["text"];
                optionWrapper.appendChild(option);
            });
        }else{
            search_list.forEach((optionData) => {
                let option = document.createElement("a");
                option.setAttribute("class", "search__option");
                option.setAttribute("href", optionData["href"]);
                option.innerText = optionData["text"];
                optionWrapper.appendChild(option);
            });
        }
        

    }else{
        let option = document.createElement("p");
        option.innerText = "Kein Ergebnis ...";
        optionWrapper.appendChild(option);
    }
    
}

function filter_searchlist(searchMap, word){
    let result = [];
    searchMap.forEach(function(data){
        if(data["text"].trim().toLowerCase().includes(word.trim().toLowerCase())){
            result.push(data);
        }
    });
    return result;
}