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
        if (request.message == "setStoreCookie") {
            // const storeId = request.payload.storeId;
            // const cookie = {
            //     url: "http://www.heb.com/",
            //     name: "CURR_SESSION_STORE",
            //     value: storeId,
            //     domain: "www.heb.com",
            //     path: "/",
            //     secure: true,
            //     httpOnly: true,
            //     sameSite: "none"
            // };
            // console.log("Set store cookie: " + JSON.stringify(cookie));
            // chrome.cookies.set(cookie);
        }
    }
);
