'use strict';

/* Constants */
const addressApi = "https://www.heb.com/commerce-api/v1/store/locator/address";
const timeSlotApi = function (storeId) {
    return `https://www.heb.com/commerce-api/v1/timeslot/timeslots?store_id=${storeId}&days=15&fulfillment_type=pickup`;
};
const hebStoreUrl = function (storeId) {
    return `https://www.heb.com/heb-store/${storeId}`;
};

/* HEB API */
function buildStoreRequestBody() {
    return {
        address: document.getElementById('address').value,
        radius: getRadius(),
        curbsideOnly: true
    };
}

async function findStores() {
    const response = await fetch(addressApi, {
        "credentials": "include",
        "headers": {
            "accept": "application/json, text/javascript, */*; q=0.01",
            "accept-language": "en-US,en;q=0.9",
            "cache-control": "no-cache",
            "content-type": "application/json; charset=UTF-8",
            "pragma": "no-cache",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-requested-with": "XMLHttpRequest"
        },
        "referrer": "https://www.heb.com/store-locations",
        "referrerPolicy": "no-referrer-when-downgrade",
        "body": JSON.stringify(buildStoreRequestBody()),
        "method": "POST",
        "mode": "cors"
    });
    const json = await response.json();

    return json.stores.map(storeRecord => {
        return {
            distance: storeRecord.distance,
            store: {
                id: storeRecord.store.id,
                name: storeRecord.store.name,
                address1: storeRecord.store.address1,
                city: storeRecord.store.city,
                state: storeRecord.store.state,
                postalCode: storeRecord.store.postalCode
            }
        };
    });
}

async function findCurbsideSlots(storeId) {
    const url = timeSlotApi(storeId);
    const response = await fetch(url, {
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
    });
    const json = await response.json();

    return json.items;
}

/* Persistence */
function save(key, value) {
    const entry = {};
    entry[key] = value;
    chrome.storage.sync.set(entry, () => {
        console.log(`Save: ${JSON.stringify(entry)}`);
    });
}

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

function loadRadius() {
    load('radius', 10, value => document.getElementById('radius').value = value);
}

function loadMaxStore() {
    load('maxStore', 10, value => document.getElementById('maxStore').value = value);
}

function loadAddress() {
    load('address', "", value => document.getElementById('address').value = value);
}

function loadMaxSlot() {
    load('maxSlot', 5, value => document.getElementById('maxSlot').value = value);
}

function loadStoreRecords() {
    load('storeRecords', [], storeRecords => renderStoreRecords(storeRecords));
}

/* Property */
function getRadius() {
    return parseInt(document.getElementById('radius').value);
}

function getMaxStore() {
    return parseInt(document.getElementById('maxStore').value);
}

function getMaxSlot() {
    return parseInt(document.getElementById('maxSlot').value);
}

/* Block Rendering */
function renderStoreCount(allStoreCount, displayStoreCount) {
    document.getElementById("resultCount").innerText = `${allStoreCount} store(s) found, displaying top ${displayStoreCount}`;
}

function renderStoreRecords(storeRecords) {
    const maxStore = getMaxStore();
    const filteredStoreRecords = storeRecords.slice(0, maxStore);

    renderStoreCount(storeRecords.length, filteredStoreRecords.length);

    for (const storeRecord of filteredStoreRecords) {
        const store = storeRecord.store;
        const distance = storeRecord.distance;

        renderStoreRecord(store, distance);
    }
}

function renderStoreRecord(store, distance) {
    const storeId = store.id;
    const storeName = store.name;
    const addressStreet = store.address1;
    const addressCity = store.city;
    const addressState = store.state;
    const addressPostalCode = store.postalCode;
    const distanceString = "" + distance.toFixed(2) + " mile(s)";

    const html = `
        <div id="store${storeId}" class="store">
            <div id="store${storeId}Address">
                <div class="storeName">${storeName}<button id="store${storeId}Select" class="storeSelect">Select</button><span class="align-right">${distanceString}</span></div>
                <div class="storeAddress">${addressStreet}</div>
                <div class="storeAddress">${addressCity}, ${addressState} ${addressPostalCode}</div>
            </div>
            <div id="store${storeId}Slots">
                <div class="storeSlot storeSlotPending">Querying ...</div>
            </div>
        </div>
    `;

    document.getElementById('resultContainer').insertAdjacentHTML('beforeend', html);

    const selectButton = document.getElementById(`store${storeId}Select`);
    selectButton.addEventListener('click', () => {
        console.log("Select Store!");
        const storeUrl = hebStoreUrl(storeId);
        chrome.runtime.sendMessage({
            message: "sendNotification",
            payload: {
                type: "basic",
                iconUrl: "./images/heb-curbside-icon.jpeg",
                title: "Curbside slot found!",
                message: storeUrl
            }
        });
        chrome.tabs.create({url: storeUrl});
    });
}

function renderStoreSlots(storeSlotsElementId, slots) {
    let html = "";

    if (slots && slots.length > 0) {
        for (const slot of slots) {
            const date = slot.date;
            const startTime = slot.timeslot.startTime.substring(11, 16);
            const endTime = slot.timeslot.endTime.substring(11, 16);

            html += `<div class=\"storeSlot storeSlotAvailable\"><span class="storeSlotDate">${date}</span>: <span class="storeSlotTime">${startTime}</span> - <span class="storeSlotTime">${endTime}</span></div>`;
        }
    } else if (slots && slots.length === 0) {
        html = "<div class=\"storeSlot storeSlotNotAvailable\">No slots available</div>";
    } else {
        html = "<div class=\"storeSlot storeSlotPending\">Querying ...</div>";
    }

    document.getElementById(storeSlotsElementId).innerHTML = html;
}

/* Page */
function loadOption() {
    console.log("Loading Option!");
    loadRadius();
    loadMaxStore();
    loadAddress();
    loadMaxSlot();
}

async function search() {
    console.log("Search!");
    save('radius', document.getElementById('radius').value);
    save('maxStore', document.getElementById('maxStore').value);
    save('address', document.getElementById('address').value);

    document.getElementById("resultCount").innerText = "";
    document.getElementById('resultContainer').innerHTML = "";

    const storeRecords = await findStores();
    save('storeRecords', storeRecords);
    renderStoreRecords(storeRecords);

    await query();
}

async function query() {
    console.log("Query!");
    save('maxSlot', document.getElementById('maxSlot').value);

    const maxSlot = getMaxSlot();
    const storeRecordElements = document.getElementById('resultContainer').children;

    for (const storeRecordElement of storeRecordElements) {
        const storeRecordElementId = storeRecordElement.id;
        const storeId = storeRecordElementId.substring(5);
        const storeSlotsElementId = "" + storeRecordElementId + "Slots";

        renderStoreSlots(storeSlotsElementId, null);

        const slots = await findCurbsideSlots(storeId);
        renderStoreSlots(storeSlotsElementId, slots.slice(0, maxSlot));
    }
}

/* Execute */
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('search').addEventListener('click', search);
    document.getElementById('query').addEventListener('click', query);
    loadOption();
    loadStoreRecords();
    setTimeout(() => query(), 1000);
});
