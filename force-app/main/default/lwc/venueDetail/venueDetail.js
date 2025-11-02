import { LightningElement, api, wire } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';

// Define the fields from the Venue__c object that this component needs to display
const FIELDS = [
    'Venue__c.Name',
    'Venue__c.VenueName__c',
    'Venue__c.Location__c',
    'Venue__c.Capacity__c',
    'Venue__c.Descriptions__c',
];

export default class VenueDetail extends LightningElement {
    // The recordId will be passed in from the URL
    @api recordId;

    // This lifecycle hook runs when the component is added to the page
    connectedCallback() {
        // This is a standard way to get URL parameters on a community page
        const urlParams = new URLSearchParams(window.location.search);
        // Find the 'recordId' parameter from the URL and set it to our property
        this.recordId = urlParams.get('recordId');
    }

    // Use the getRecord wire adapter to fetch the venue record data automatically.
    // The '$recordId' makes it reactive, so it will refetch if the recordId changes.
    @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
    venue;
}