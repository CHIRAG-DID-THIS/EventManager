import { LightningElement, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getObjectInfo, getPicklistValues } from 'lightning/uiObjectInfoApi';
import { refreshApex } from '@salesforce/apex';

import EVENT_SERVICE_OBJECT from '@salesforce/schema/EventServices__c';
import SERVICE_TYPE_FIELD from '@salesforce/schema/EventServices__c.Service_Type__c';
import SERVICE_SUBTYPE_FIELD from '@salesforce/schema/EventServices__c.Service_SubType__c';

import getServices from '@salesforce/apex/VendorDataController.getServices';
import saveService from '@salesforce/apex/VendorDataController.saveService';

const COLS = [
    { label: 'Service Type', fieldName: 'Service_Type__c', type: 'text' },
    { label: 'Subtype', fieldName: 'Service_Subtype__c', type: 'text' },
    { label: 'Price', fieldName: 'Price__c', type: 'currency' },
    { type: 'action', typeAttributes: { rowActions: [{ label: 'Edit', name: 'edit' }] } }
];

export default class ServiceManager extends LightningElement {
    @track services = [];
    columns = COLS;
    wiredServicesResult;

    @track isModalOpen = false;
    @track currentService = {};

    @track typeOptions = [];
    @track subtypeOptions = [];
    
    // Wire to get object info for picklists
    @wire(getObjectInfo, { objectApiName: EVENT_SERVICE_OBJECT })
    objectInfo;

    // Wire to get Service Type picklist values
    @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: SERVICE_TYPE_FIELD })
    wiredTypePicklist({ data, error }) {
        if (data) this.typeOptions = data.values;
    }

    // Wire to get Service Subtype picklist values
    @wire(getPicklistValues, { recordTypeId: '$objectInfo.data.defaultRecordTypeId', fieldApiName: SERVICE_SUBTYPE_FIELD })
    wiredSubtypePicklist({ data, error }) {
        if (data) this.subtypeOptions = data.values;
    }
    
    @wire(getServices)
    wiredServices(result) {
        this.wiredServicesResult = result;
        if (result.data) {
            this.services = result.data;
        } else if (result.error) {
            this.showToast('Error', 'Could not load services.', 'error');
        }
    }

    handleAddNew() {
        this.currentService = {};
        this.isModalOpen = true;
    }

    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        if (actionName === 'edit') {
            this.currentService = { ...row };
            this.isModalOpen = true;
        }
    }

    closeModal() {
        this.isModalOpen = false;
    }

    handleInputChange(event) {
        const { name, value } = event.target;
        this.currentService = { ...this.currentService, [name]: value };
    }

    handleSave() {
        saveService({ serviceRecord: this.currentService })
            .then(() => {
                this.showToast('Success', 'Service saved successfully.', 'success');
                this.isModalOpen = false;
                return refreshApex(this.wiredServicesResult);
            })
            .catch(error => {
                this.showToast('Error', error.body.message, 'error');
            });
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}