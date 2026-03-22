import { userDialog } from "./userDialog.js";

const uploadData = [];
let dialogUpload;
let typesExtensions = [];
/**
 * @type {HTMLFormElement}
 */
let dialogPreview;
let dialogInput;

/**
 * Erstellt eine UploadDialog und gibt die Daten dann als Formdata-Promis zurück.
 * @param {string[]} typesExtensions 
 * @param {string[]} typesMime 
 * @param {boolean} multiple 
 * @returns {Promise<FormData>}
 */
export async function userDialogUpload(typesExtensionsP, typesMime, multiple){
    injectCss()
    typesExtensions=typesExtensionsP;
    return (await userDialog({
        id:"dialog_upload", 
        title:`<h2>Datein hochladen</h2> <p>(${typesExtensions.map(e=>"."+e).join(", ")})</p>`,
        content:`
             <p class="upload_files__description">Wählen Sie Dateien aus, die hochgeladen werden sollen ...</p>
            <input type="file" name="files[]" ${multiple?"multiple":""} class="upload_files__input" accept="${typesExtensions.map(e=>"."+e).join(",")+","+typesMime.join(",")}" required>
            <div class="file_gallery upload_files__preview"></div>
        `,
        confirmText:"Hochladen",
        onInsert: onInsertFunc
    })).data;
}

const onInsertFunc = function (id) {
    dialogUpload = document.querySelector(`[id="${id}"]`);
        
    dialogPreview = dialogUpload.querySelector(".upload_files__preview");
    dialogInput = dialogUpload.querySelector(".upload_files__input");
    dialogUpload.showModal();
    
    dialogUpload.addEventListener("click", handleDialogClick);

    dialogInput.addEventListener("change", function (){
        const files = Array.from(dialogInput.files);
        for (const file of files){       
            console.log(file)  
            if(!typesExtensions.includes(file.name.split('.').pop().toLowerCase())) continue;
            const isDuplicate = uploadData.some(f => f.name === file.name && f.size === file.size);
            if (!isDuplicate) {
                uploadData.push(file);
            }
        }
        console.log(uploadData);
        syncInputElm();
        displayUploadPreview();
    });
}


function displayUploadPreview(){
    let templateHtml = `
        <div class="file_box {type}" index="{index}">
            {file}
            {other}
            <div class="file_toolbar">
                <button class="upload_delete button" data-shape="round">
                    <span class="msr">close</span>
                </button>
            </div>
        </div>
    `;
    let previewHTML = "";
    uploadData.forEach((file, index) => {
        const category = file.type.substring(0, file.type.indexOf('/'));
        const type = file.name.split('.').pop()

        let html = templateHtml.replace("{index}", index);

        switch (category) {
            case "image":
                html =  html.replace("{file}", `<img src="${URL.createObjectURL(file)}" alt="image" d-img">`);
                html =  html.replace("{other}", `<input class="input" name="upload_copyright[]" type="text" placeholder="(copyright)" required></input>`);
                html =  html.replace("{type}", `complex`);
                break;
            case "video":
                html =  html.replace("{file}", `<video controls class="upload_file"><source src="${URL.createObjectURL(file)}"/></video>`);
                html =  html.replace("{other}", `<input class="input" name="upload_copyright[]" type="text" placeholder="(copyright)" required></input>`);
                html =  html.replace("{type}", `complex`);
                break;
            case "audio":
                html = html.replace("{file}", `<audio controls class="upload_file"><source src="${URL.createObjectURL(file)}"/></audio>`);
                html =  html.replace("{other}", `<input class="input" name="upload_copyright[]" type="text" placeholder="(copyright)" required></input>`);
                html =  html.replace("{type}", `complex`);
                break;
            default:
                html = html.replace("{file}", `<div><p class="upload__name">${file.name}</p> <p class="upload__type">${type}</p></div>`);
                html =  html.replace("{other}", `<input class="" name="upload_copyright[]" type="hidden" value="" data-nonses>`);
                html =  html.replace("{type}", `normal`);
                break;
        }
        previewHTML += html;
    });
    dialogPreview.textContent = "";
    dialogPreview.insertAdjacentHTML("beforeend", previewHTML);
}

function handleDialogClick(e) {
    const deleteButton = e.target.closest(".upload_delete");
    if(deleteButton){
        const file_box = deleteButton.closest(".file_box");
        let index = parseInt(file_box.getAttribute("index"));
        uploadData.splice(index, 1);
        file_box.remove();
        syncInputElm();
        dialogUpload.querySelectorAll(".file_box").forEach((obj, index) => {
            obj.setAttribute("index", index);
        });
    }   
}

function syncInputElm(){
    const dt = new DataTransfer();
    
    uploadData.forEach(file => {
        dt.items.add(file);
    });

    dialogInput.files = dt.files;
}

function injectCss(){
    const cssUrl = new URL('./userDialogUpload_addon.css', import.meta.url);
    if (document.querySelector(`link[href="${cssUrl.href}"]`)) return; 
    const cssLink = `<link rel="stylesheet" href="${cssUrl.href}">`;
    document.head.insertAdjacentHTML("beforeend", cssLink);
}