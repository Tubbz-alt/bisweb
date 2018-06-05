const $ = require('jquery');
const webutil = require('bis_webutil.js');
const wsutil = require('../../fileserver/wsutil.js');

class FileServer extends HTMLElement {

    constructor() {
        super();
    }

    /**
     * Attaches the algorithm controller to the tree viewer and attaches the event to place the tree viewer's menu in the shared menubar once the main viewer renders.
     */
    connectedCallback() {
        let socket;

        webutil.runAfterAllLoaded(() => {
            let menuBarID = this.getAttribute('bis-menubarid');
            let menuBar = document.querySelector(menuBarID).getMenuBar();

            let algorithmControllerID = this.getAttribute('bis-algorithmcontrollerid');
            this.algorithmcontroller = document.querySelector(algorithmControllerID);

            if (menuBar) {
                let serverMenu = webutil.createTopMenuBarMenu('Server', menuBar);
                webutil.createMenuItem(serverMenu, 'Connect to File Server', () => {
                    socket = this.connectToServer();
                });

                webutil.createMenuItem(serverMenu, 'Request Files', () => {
                    let files = [
                        'javascript/bisweb/data/a1.nii.gz'
                    ];
                    this.sendFileRequest(socket, {
                        command : 'getfile',
                        files : files
                    });
                });

                webutil.createMenuItem(serverMenu, 'Show Server Files', () => {
                    this.requestFileList(socket);
                });
            }

            socket = this.connectToServer();
        });

    }

    connectToServer() {
        let socket = new WebSocket('ws://localhost:8081');

        socket.addEventListener('error', (event) => {
            console.log('An error occured', event);
        });

        socket.addEventListener('message', (event) => {
            console.log('received data', event);
            let data;

            //parse stringified JSON if the transmission is text
            if (typeof(event.data) === "string") {
                try {
                    data = JSON.parse(event.data);
                } catch(e) {
                    console.log('an error occured while parsing event.data', e);
                    return;
                }
            } else {
                data = event.data;
            }

            switch (data.type) {
                case 'filelist' : this.displayFileList(data.payload);
                case 'error' : console.log('Error from client:', data.payload);
                default : console.log('received a binary transmission -- interpreting as an image'); this.handleImageTransmission(event.data);
            }    
        });

        return socket;
    }

    requestFileList(socket) {
        let command = JSON.stringify({ 'command' : 'show' }); 
        socket.send(command);
    }

    //TODO: Implement display with JSTree
    displayFileList(list) {

    }

    sendFileRequest(socket, files = null) {
        let filesdata = JSON.stringify(files);
        socket.send(filesdata);
    }

    handleImageTransmission(data) {
        let reader = new FileReader();
        reader.addEventListener('loadend', () => {
            let rawData = new Uint8Array(reader.result);
            this.algorithmcontroller.sendImageToViewer(rawData, { viewername: this.defaultViewer });
        });

        reader.readAsArrayBuffer(data);
    }
}

webutil.defineElement('bisweb-fileserver', FileServer);
