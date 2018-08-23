const bisweb_fileserverclient = require('bisweb_fileserverclient.js');
const bis_genericio = require('bis_genericio.js');
const webfileutil = require('bis_webfileutil');
const webutil = require('bis_webutil.js');
const wsutil = require('wsutil.js');
const BiswebImage = require('bisweb_image.js');
const FileServer = new bisweb_fileserverclient();

let setFileMode = () => {
    return new Promise( (resolve, reject) => {
        console.log('webfileutil', webfileutil);
        webfileutil.setMode('server');
        resolve();
    });
}

let connectToServer = () => {
    return new Promise( (resolve, reject) => {

        webutil.runAfterAllLoaded( () => {
            FileServer.connectToServer();

            console.log('Fileserver socket', FileServer.socket);
            let timeoutEvent = setTimeout( () => {
                reject('server timed out waiting for goodAuth message');
            }, 5000);

            let goodAuthListener = (event) => {
                let data = wsutil.parseJSON(event.data);
                if (data.type === 'goodauth') {
                    FileServer.socket.removeEventListener('message', goodAuthListener);
                    bis_genericio.setFileServerObject(FileServer);
                    clearTimeout(timeoutEvent);
                    resolve();
                }
            };
            
            FileServer.socket.addEventListener('message', goodAuthListener);
        });
    });
};

let uploadImage = () => {
    return new Promise( (resolve, reject) => {
        let timeoutEvent = setTimeout( () => {
            reject('server timed out waiting for acknowledgment of upload');
        }, 10000);

        console.log('fileserver socket', FileServer.socket);

        //TODO: Find way to code a relative filepath
        let testImage = bis_genericio.read('/home/zach/javascript/bisweb/js/test/regressionImages/MNI_2mm_orig.nii.gz', true).then( (response) => {
            FileServer.uploadFileToServer('testfile.nii.gz', response.data);
            
            let uploadSuccessListener = (event) => {
                let data = wsutil.parseJSON(event.data);
                if (data.type === 'uploadcomplete') {
                    FileServer.socket.removeEventListener('message', uploadSuccessListener);
                    clearTimeout(timeoutEvent);
                    resolve();
                }
            };

            FileServer.socket.addEventListener('message', uploadSuccessListener);
        }).catch( (e) => {
            reject(e);
        });
    });
};

let downloadImage = () => {
    return new Promise( (resolve, reject) => {
        let timeoutEvent = setTimeout( () => {
            reject('server timed out waiting for acknowledgment of upload');
        }, 6000);

        console.log('fileserver socket', FileServer.socket);

        let downloadSuccessListener = (event) => {
            if (typeof(event.data) !== "string") {
                FileServer.socket.removeEventListener('message', downloadSuccessListener);
                clearTimeout(timeoutEvent);
                resolve();
            }
        };

        FileServer.socket.addEventListener('message', downloadSuccessListener);

        FileServer.downloadFile('/home/zach/javascript/bisweb/js/test/regressionImages/MNI_2mm_orig.nii.gz', true);

    });    
}

let uploadAndCompare = () => {
    return new Promise( (resolve, reject) => {
        let timeoutEvent = setTimeout( () => {
            reject('server timed out waiting for acknowledgment of upload');
        }, 10000);

        console.log('fileserver socket', FileServer.socket);

        //TODO: Find way to code a relative filepath
        let testImage = bis_genericio.read('/home/zach/javascript/bisweb/js/test/regressionImages/MNI_2mm_orig.nii.gz', true).then( (response) => {

            let baseData = response.data;
            let baseImage = new BiswebImage().initialize();
            baseImage.parseNII(baseData);

            bis_genericio.write('testfile.nii.gz', response.data, true);
            
            let uploadSuccessListener = (event) => {
                let data = wsutil.parseJSON(event.data);
                if (data.type === 'uploadcomplete') {
                    FileServer.socket.removeEventListener('message', uploadSuccessListener);
                    let uploadedImage = new BiswebImage();
                    uploadedImage.load('/home/zach/testfile.nii.gz', false).then( () => {
                        uploadedImage.compareWithOther(testImage)
                    });
                    resolve();
                }
            };

            FileServer.socket.addEventListener('message', uploadSuccessListener);
        }).catch( (e) => {
            reject(e);
        });
    });
}

let serverPretests = [
    {
        'name' : 'Set File Mode', 
        'test' : setFileMode
    },
    {
        'name' : 'Connect to Server',
        'test' : connectToServer
    }
];

let serverTests = [
    {
        'name' : 'Upload Image',
        'test' : uploadImage
    },
    {
        'name' : 'Download Image',
        'test' : downloadImage
    },
    {
        'name' : 'Upload and Compare',
        'test' : uploadAndCompare
    }
];

module.exports = {
    connectToServer : connectToServer,
    uploadImage : uploadImage,
    pretests : serverPretests,
    tests : serverTests
};