public with sharing class VenueImageManager {

    /**
     * Links newly uploaded Content Documents to the Venue record by updating the
     * Primary and Gallery ID fields.
     * @param contentDocIds List of ContentDocument IDs (from lightning-file-upload).
     * @param venueId The ID of the Venue__c record.
     */
    @AuraEnabled
    public static void linkUploadedFiles(List<String> contentDocIds, Id venueId) {
        if (contentDocIds == null || contentDocIds.isEmpty() || venueId == null) {
            return;
        }

        // 1. Fetch the Venue record to check existing IDs
        Venue__c venue = [SELECT Id, Primary_Image_ID__c, Gallery_Image_IDs__c FROM Venue__c WHERE Id = :venueId LIMIT 1];

        String currentGalleryIds = venue.Gallery_Image_IDs__c != null ? venue.Gallery_Image_IDs__c : '';
        List<String> existingIds = currentGalleryIds.split(',', 0);
        
        List<String> newIdsToAppend = new List<String>();

        for (String newDocId : contentDocIds) {
            // Check if the Venue has a Primary Image yet
            if (String.isBlank(venue.Primary_Image_ID__c)) {
                // Set the first new file as the Primary Image
                venue.Primary_Image_ID__c = newDocId;
            } else if (!existingIds.contains(newDocId)) {
                // Add all subsequent files to the list for the Gallery
                newIdsToAppend.add(newDocId);
            }
        }

        // 2. Append the new IDs to the existing Gallery string
        if (!newIdsToAppend.isEmpty()) {
            if (String.isNotBlank(currentGalleryIds)) {
                currentGalleryIds += ',';
            }
            currentGalleryIds += String.join(newIdsToAppend, ',');
            venue.Gallery_Image_IDs__c = currentGalleryIds;
        }

        // 3. Update the Venue record
        update venue;
    }

    /**
     * Updates the venue description by appending uploaded images while preserving existing content.
     * @param venueId The ID of the Venue__c record.
     * @param uploadedFileIds List of ContentDocument IDs from the uploaded files.
     */
    @AuraEnabled
    public static void updateVenueDescription(Id venueId, List<String> uploadedFileIds) {
        if (venueId == null || uploadedFileIds == null || uploadedFileIds.isEmpty()) {
            throw new AuraHandledException('Venue ID and uploaded file IDs are required.');
        }

        try {
            // 1. Fetch the current venue description
            Venue__c venue = [SELECT Id, Descriptions__c FROM Venue__c WHERE Id = :venueId LIMIT 1];
            
            // 2. Get ContentVersion details for the uploaded files (needed for proper URL generation)
            List<ContentVersion> uploadedVersions = [
                SELECT Id, ContentDocumentId, Title, FileExtension 
                FROM ContentVersion 
                WHERE ContentDocumentId IN :uploadedFileIds AND IsLatest = true
            ];

            // 3. Build image HTML tags for each uploaded file using Lightning-compatible URLs
            String imageHtml = '';
            System.debug('=== VENUE IMAGE MANAGER DEBUG ===');
            System.debug('Venue ID: ' + venueId);
            System.debug('Number of uploaded versions: ' + uploadedVersions.size());
            
            for (ContentVersion version : uploadedVersions) {
                // Generate absolute URL that works with Lightning Web Components
                // Get the base URL of the current org
                String baseUrl = URL.getOrgDomainUrl().toExternalForm();
                String imageUrl = baseUrl + '/sfc/servlet.shepherd/version/download/' + version.Id;
                
                System.debug('Generated image URL: ' + imageUrl);
                System.debug('ContentVersion ID: ' + version.Id + ', Title: ' + version.Title);
                System.debug('Base URL: ' + baseUrl);
                
                imageHtml += '<img src="' + imageUrl + 
                           '" alt="' + version.Title + '" style="max-width: 300px; height: auto; margin: 10px;" /><br/>';
            }
            
            System.debug('Generated image HTML: ' + imageHtml);

            // 4. Append images to existing description (preserve existing content)
            String updatedDescription = '';
            System.debug('Existing description: ' + venue.Descriptions__c);
            
            if (String.isNotBlank(venue.Descriptions__c)) {
                updatedDescription = venue.Descriptions__c + '<br/><br/>' + imageHtml;
            } else {
                updatedDescription = imageHtml;
            }
            
            System.debug('Final updated description: ' + updatedDescription);

            // 5. Update the venue record
            venue.Descriptions__c = updatedDescription;
            update venue;
            
            System.debug('Venue description updated successfully');

        } catch (Exception e) {
            throw new AuraHandledException('Error updating venue description: ' + e.getMessage());
        }
    }
}