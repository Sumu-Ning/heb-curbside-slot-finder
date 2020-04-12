'use strict';

function load(key, defaultValue, callback) {
    chrome.storage.sync.get(key, entry => {
        let value;
        if (entry && entry[key]) {
            console.log(`Key [${key}] Found: [${JSON.stringify(entry)}]`);
            value = entry[key];
        } else {
            console.log(`Key [${key}] Not Found, default value: [${defaultValue}]`);
            value = defaultValue;
        }

        callback(value);
    });
}

function findCurbsideSlots(storeId) {
    const url = `https://www.heb.com/commerce-api/v1/timeslot/timeslots?store_id=${storeId}&days=15&fulfillment_type=pickup`;
    return fetch(url, {
        "credentials": "include",
        "headers": {
            "accept": "application/json, text/plain, */*",
            "accept-language": "en-US,en;q=0.9",
            "cache-control": "no-cache",
            "pragma": "no-cache",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin"
        },
        "referrer": "https://www.heb.com/store-locations",
        "referrerPolicy": "no-referrer-when-downgrade",
        "body": null,
        "method": "GET",
        "mode": "cors"
    }).then(
        response => response.json()
    ).then(
        json => json.items
    ).catch((error) => {
        console.error('Error:', error);
    });
}

/* Registration */

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
        console.log(`Process Message: ${JSON.stringify(request)}`);
        if (request.message === 'updateMonitor') {
            updateMonitor(request.payload.interval);
        }
    }
);

chrome.notifications.onClicked.addListener(notificationId => {
        chrome.tabs.create({url: notificationId});
        chrome.notifications.clear(notificationId);
    }
);

chrome.alarms.onAlarm.addListener(alarm => {
    console.log(alarm);
    if (alarm.name === 'checkSlots') {
        checkSlots();
    }
});

/* Functions */
function sendSlotFoundNotification(storeRecord) {
    const store = storeRecord.store;
    const address = `${store.address1}, ${store.city}, ${store.state} ${store.postalCode}`;

    const options = {
        type: "basic",
        iconUrl: "./images/heb-curbside-icon.jpeg",
        title: "H-E-B curbside slot found!",
        message: address,
        contextMessage: store.name,
        requireInteraction: true
    };

    const storeUrl = `https://www.heb.com/heb-store/${store.id}`;

    chrome.notifications.create(storeUrl, options, notificationId => {
        console.log(notificationId);
    });
}

function checkSlots() {
    console.log("Check Slots!");
    load('storeRecords', [], storeRecords => {
        storeRecords
            .filter(storeRecord => storeRecord.selected)
            .forEach(storeRecord => {
            const storeId = storeRecord.store.id;

            findCurbsideSlots(storeId).then(slots => {
                if (slots && slots.length > 0) {
                    console.log(`Slots found for ${storeId}`);
                    sendSlotFoundNotification(storeRecord);
                } else {
                    console.log(`Slots not found for ${storeId}`);
                    chrome.notifications.clear(`https://www.heb.com/heb-store/${storeId}`);
                }
            });
        });
    });
}

function updateMonitor(interval) {
    if (interval > 0) {
        console.log(`Set periodic monitor check to every ${interval} minute(s)`);
        chrome.alarms.create('checkSlots', {delayInMinutes: 0, periodInMinutes: interval});
    } else {
        console.log("Turn off Periodic Check!");
        chrome.alarms.clear('checkSlots');
    }
}
