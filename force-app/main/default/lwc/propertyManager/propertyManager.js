import { LightningElement, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import getVenues from '@salesforce/apex/VendorDataController.getVenues';
import saveVenue from '@salesforce/apex/VendorDataController.saveVenue';

const COLS = [
    { label: 'Venue Name', fieldName: 'VenueName__c', type: 'text' },
    { label: 'Capacity', fieldName: 'Capacity__c', type: 'number' },
    { label: 'Location', fieldName: 'Location__c', type: 'text' },
    { type: 'action', typeAttributes: { rowActions: [{ label: 'Edit', name: 'edit' }] } }
];

export default class PropertyManager extends LightningElement {
    @track venues = [];
    columns = COLS;
    wiredVenuesResult;

    @track isModalOpen = false;
    @track currentVenue = {};

    @wire(getVenues)
    wiredVenues(result) {
        this.wiredVenuesResult = result;
        if (result.data) {
            this.venues = result.data;
        } else if (result.error) {
            this.showToast('Error', 'Could not load properties.', 'error');
        }
    }

    handleAddNew() {
        this.currentVenue = {};
        this.isModalOpen = true;
    }

    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        if (actionName === 'edit') {
            this.currentVenue = { ...row };
            this.isModalOpen = true;
        }
    }

    closeModal() {
        this.isModalOpen = false;
    }

    handleInputChange(event) {
        const { name, value } = event.target;
        this.currentVenue = { ...this.currentVenue, [name]: value };
    }
    
    handleRichTextChange(event){
        this.currentVenue.Descriptions__c = event.target.value;
    }

    handleSave() {
        saveVenue({ venueRecord: this.currentVenue })
            .then(() => {
                this.showToast('Success', 'Property saved successfully.', 'success');
                this.isModalOpen = false;
                return refreshApex(this.wiredVenuesResult);
            })
            .catch(error => {
                this.showToast('Error', error.body.message, 'error');
            });
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}