'use strict';

/* Constants */
const addressApi = "https://www.heb.com/commerce-api/v1/store/locator/address";
const timeSlotApi = function (storeId) {
    return `https://www.heb.com/commerce-api/v1/timeslot/timeslots?store_id=${storeId}&days=15&fulfillment_type=pickup`;
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

    return json.stores;
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
        console.log('Save: ' + JSON.stringify(entry));
    });
}

function load(key, defaultValue, elementId) {
    chrome.storage.sync.get(key, entry => {
        let value;
        if (entry && entry[key]) {
            console.log('Read Found: ' + JSON.stringify(entry));
            value = entry[key];
        } else {
            console.log('Read Not Found, default value: ' + defaultValue);
            value = defaultValue;
        }

        document.getElementById(elementId).value = value;
    });
}

function loadRadius() {
    return load('radius', 10, 'radius');
}

function loadMaxStore() {
    return load('maxStore', 10, 'maxStore');
}

function loadMaxSlot() {
    return load('maxSlot', 5, 'maxSlot');
}

function loadAddress() {
    return load('address', "", 'address');
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

function renderStoreContainer(store, distance) {
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
                <div class="storeName">${storeName}<span class="align-right">${distanceString}</span></div>
                <div class="storeAddress">${addressStreet}</div>
                <div class="storeAddress">${addressCity}, ${addressState} ${addressPostalCode}</div>
            </div>
            <div id="store${storeId}Slots">
                <div class="storeSlot">Querying ...</div>
            </div>
        </div>
    `;

    document.getElementById('resultContainer').insertAdjacentHTML('beforeend', html);
}

function renderStoreSlots(storeId, slots) {
    const storeSlotsElementId = `store${storeId}Slots`;

    let html = "";

    if (slots && slots.length > 0) {
        for (const slot of slots) {
            const date = slot.date;
            const startTime = slot.timeslot.startTime.substring(11, 16);
            const endTime = slot.timeslot.endTime.substring(11, 16);

            html += `<div class=\"storeSlot storeSlotAvailable\"><span class="storeSlotDate">${date}</span>: <span class="storeSlotTime">${startTime}</span> - <span class="storeSlotTime">${endTime}</span></div>`;
        }

        document.getElementById(storeSlotsElementId).innerHTML
    } else {
        html = "<div class=\"storeSlot storeSlotNotAvailable\">No slots available</div>";
    }

    document.getElementById(storeSlotsElementId).innerHTML = html;
}

/* Page */
function saveOption() {
    console.log("Saving Option!");
    save('radius', document.getElementById('radius').value);
    save('maxStore', document.getElementById('maxStore').value);
    save('maxSlot', document.getElementById('maxSlot').value);
    save('address', document.getElementById('address').value);
}

function loadOption() {
    console.log("Loading Option!");
    loadRadius();
    loadMaxStore();
    loadMaxSlot();
    loadAddress();
}

async function query() {
    console.log("Query!");
    saveOption();
    document.getElementById("resultCount").innerText = "";
    document.getElementById('resultContainer').innerHTML = "";

    const stores = await findStores();
    const maxStore = getMaxStore();
    const maxSlot = getMaxSlot();
    const filteredStores = stores.slice(0, maxStore);

    renderStoreCount(stores.length, filteredStores.length);

    for (const storeRecord of filteredStores) {
        const store = storeRecord.store;
        const distance = storeRecord.distance;

        renderStoreContainer(store, distance);

        const storeId = store.id;
        const slots = await findCurbsideSlots(storeId);
        renderStoreSlots(storeId, slots.slice(0, maxSlot));
    }
}

/* Execute */
document.addEventListener('DOMContentLoaded', function () {
    loadOption();
    document.getElementById('query').addEventListener('click', query);
});
