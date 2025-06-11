let onSubmit = document.getElementById("searchForm");
let userTitle=document.getElementById("title")


onSubmit.addEventListener("submit", function (e) {
  e.preventDefault();

  const userInput = document.getElementById("title").value;
  console.log("User input in popup:", userInput);

  chrome.runtime.sendMessage({title:userInput});

  chrome.storage.local.get("title",(result)=>{
    console.log("from storage: ", result.title)
    userTitle.value=result.title
  })
});

chrome.storage.local.get()
