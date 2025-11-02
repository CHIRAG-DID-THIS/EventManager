import { LightningElement, api } from 'lwc';
import linkFiles from '@salesforce/apex/VenueImageManager.linkUploadedFiles';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class VenueImageUploader extends LightningElement {
    @api recordId; // Venue__c record ID
    uploadedCount = 0;

    get acceptedFormats() {
        return ['.jpg', '.jpeg', '.png'];
    }

    handleUploadFinished(event) {
        // 1. Get the list of uploaded files (ContentDocument IDs)
        const uploadedFiles = event.detail.files;
        this.uploadedCount = uploadedFiles.length;
        
        if (this.uploadedCount > 0) {
            // Extract just the ContentDocumentId from the list
            const contentDocIds = uploadedFiles.map(file => file.documentId);
            
            // 2. Call Apex to update the Venue__c record with the IDs
            linkFiles({ contentDocIds: contentDocIds, venueId: this.recordId })
                .then(() => {
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Success',
                            message: `${this.uploadedCount} image(s) successfully linked!`,
                            variant: 'success'
                        })
                    );
                })
                .catch(error => {
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Error linking files',
                            message: error.body.message,
                            variant: 'error'
                        })
                    );
                });
        }
    }
}