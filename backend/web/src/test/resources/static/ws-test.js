var ws = new WebSocket("ws://localhost:8080/ws");

ws.onopen = function() {
    addMsg("WebSocket Opened");
    ws.send('{"ping":{}}')

    ws.send('Hi there');
}

ws.onmessage = function(evt) {
    var newDiv = document.createElement("div");
    newDiv.innerHTML = "> " + evt.data;

    var holder = document.getElementById("holder");
    holder.appendChild(newDiv);
}

ws.onclose = function() {
    addMsg("WebSocked Closed. Refresh page to open new WebSocket.");
}

ws.onerror = function() {
    addMsg("WebSocked Error. Try refreshing the page.");
}

function addMsg(msg) {
    var newDiv = document.createElement("div");
    newDiv.innerHTML = msg;

    var holder = document.getElementById("holder");
    holder.appendChild(newDiv);
}