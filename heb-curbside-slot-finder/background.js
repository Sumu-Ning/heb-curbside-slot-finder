'use strict';

chrome.runtime.onInstalled.addListener(function () {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
        chrome.declarativeContent.onPageChanged.addRules([{
            conditions: [new chrome.declarativeContent.PageStateMatcher({
                pageUrl: {hostEquals: 'www.heb.com'},
            })],
            actions: [new chrome.declarativeContent.ShowPageAction()]
        }]);
    });
});


chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        console.log("Process Message!");
        if (request.message === "sendNotification") {
            const options = request.payload;
            sendNotification(options);
        }
    }
);

function sendNotification(options) {
    console.log(options);
    chrome.notifications.create(options, notificationId => console.log(notificationId));
}