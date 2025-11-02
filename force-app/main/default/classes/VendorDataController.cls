/**
 * @description Handles all data operations for Vendors, including company setup, and venue/service management.
 * This is the complete and consolidated controller for Phase 1 and Phase 2.
 */
public with sharing class VendorDataController {

    // --- Phase 1 Methods --- //

    /**
     * @description Saves the Event Company information for a newly registered vendor.
     * This method is called from the vendorCompanySetup LWC.
     */
    @AuraEnabled
    public static String completeCompanySetup(String companyName, String companyPhone) {
        if (String.isBlank(companyName)) { 
            return 'Error: Company Name is required.'; 
        }
        
        Id currentUserId = UserInfo.getUserId();

        // Check if a company already exists for this user to prevent duplicates.
        List<EventComapny__c> existingCompanies = [
            SELECT Id FROM EventComapny__c WHERE Owner_User__c = :currentUserId LIMIT 1
        ];
        if (!existingCompanies.isEmpty()) { 
            return 'Error: A company profile already exists for this user.';
        }
        
        try {
            EventComapny__c newCompany = new EventComapny__c(
                Company_Name__c = companyName, 
                Phone__c = companyPhone, 
                Owner_User__c = currentUserId
            );
            insert newCompany;
            return 'success';
        } catch (Exception e) {
            System.debug('Company Setup Error: ' + e.getMessage());
            return 'An error occurred while saving your company information: ' + e.getMessage();
        }
    }

    /**
     * @description Checks if the current vendor user has completed their initial company setup.
     */
    @AuraEnabled(cacheable=true)
    public static Boolean isSetupComplete() {
        Id currentUserId = UserInfo.getUserId();
        List<EventComapny__c> existingCompanies = [
            SELECT Id FROM EventComapny__c WHERE Owner_User__c = :currentUserId LIMIT 1
        ];
        return !existingCompanies.isEmpty();
    }

    // --- Phase 2 Methods --- //

    /**
     * @description Fetches all Venue records owned by the current logged-in vendor user.
     * @return A list of Venue__c records.
     */
    @AuraEnabled(cacheable=true)
    public static List<Venue__c> getVenues() {
        Id currentUserId = UserInfo.getUserId();
        // Security: Ensure we only return venues owned by the currently logged-in user.
        return [SELECT Id, Name, VenueName__c, Location__c, Descriptions__c, Capacity__c 
                FROM Venue__c 
                WHERE OwnerId = :currentUserId 
                ORDER BY CreatedDate DESC];
    }

    /**
     * @description Creates or updates a Venue record.
     * @param venueRecord The Venue record to be saved (Id can be null for creation).
     * @return The ID of the saved Venue record.
     */
    @AuraEnabled
    public static Id saveVenue(Venue__c venueRecord) {
        // Security: Before updating, verify that the user owns the record.
        if (venueRecord.Id != null) {
            List<Venue__c> existingVenues = [
                SELECT Id FROM Venue__c WHERE Id = :venueRecord.Id AND OwnerId = :UserInfo.getUserId()
            ];
            if(existingVenues.isEmpty()) {
                throw new AuraHandledException('You do not have permission to edit this record.');
            }
        }
        upsert venueRecord;
        return venueRecord.Id;
    }

    /**
     * @description Fetches all EventService records linked to the vendor's company.
     * @return A list of EventServices__c records.
     */
    @AuraEnabled(cacheable=true)
    public static List<EventServices__c> getServices() {
        Id currentUserId = UserInfo.getUserId();
        
        // Find the user's company first.
        List<EventComapny__c> companies = [
            SELECT Id FROM EventComapny__c WHERE Owner_User__c = :currentUserId LIMIT 1
        ];
        if (companies.isEmpty()) {
            return new List<EventServices__c>(); // Return empty list if no company is set up.
        }
        Id companyId = companies[0].Id;
        
        // Security: Return services only for that specific company.
        return [SELECT Id, Name, Service_Type__c, Service_Subtype__c, Price__c 
                FROM EventServices__c 
                WHERE EventComapny__c = :companyId 
                ORDER BY CreatedDate DESC];
    }

    /**
     * @description Creates or updates an EventService record.
     * @param serviceRecord The EventServices__c record to be saved.
     * @return The ID of the saved service record.
     */
    @AuraEnabled
    public static Id saveService(EventServices__c serviceRecord) {
        Id currentUserId = UserInfo.getUserId();
        
        // Find the user's company to link the service to.
        List<EventComapny__c> companies = [
            SELECT Id FROM EventComapny__c WHERE Owner_User__c = :currentUserId LIMIT 1
        ];
        if (companies.isEmpty()) {
            throw new AuraHandledException('You must have a company profile before you can add services.');
        }
        Id companyId = companies[0].Id;

        // Security: Before saving, ensure the record is forcibly linked to the user's company.
        serviceRecord.EventComapny__c = companyId;

        upsert serviceRecord;
        return serviceRecord.Id;
    }

    /**
     * @description Fetches all Availability blocks for a given venue owned by the current vendor.
     */
    @AuraEnabled(cacheable=true)
    public static List<Availabilty__c> getAvailabilityForVenue(Id venueId) {
        if (venueId == null) {
            return new List<Availabilty__c>();
        }
        // Ensure the venue belongs to the current user
        Id currentUserId = UserInfo.getUserId();
        List<Venue__c> myVenue = [SELECT Id FROM Venue__c WHERE Id = :venueId AND OwnerId = :currentUserId LIMIT 1];
        if (myVenue.isEmpty()) {
            throw new AuraHandledException('You do not have permission to view availability for this venue.');
        }
        return [
            SELECT Id, StartDate__c, EndDate__c, Venue__c
            FROM Availabilty__c
            WHERE Venue__c = :venueId
            ORDER BY StartDate__c
        ];
    }

    /**
     * @description Creates or updates an Availability block for a venue owned by the current vendor.
     * @param block The Availabilty__c record to save. VID__c will be enforced to the provided venueId.
     * @param venueId The Venue Id to associate the block with.
     * @return The Id of the saved Availabilty__c record.
     */
    @AuraEnabled
    public static Id saveAvailability(Availabilty__c block, Id venueId) {
        if (venueId == null) {
            throw new AuraHandledException('Venue Id is required to save availability.');
        }
        Id currentUserId = UserInfo.getUserId();
        List<Venue__c> myVenue = [SELECT Id FROM Venue__c WHERE Id = :venueId AND OwnerId = :currentUserId LIMIT 1];
        if (myVenue.isEmpty()) {
            throw new AuraHandledException('You do not have permission to modify availability for this venue.');
        }
        // Enforce association
        block.Venue__c = venueId;
        upsert block;
        return block.Id;
    }
}