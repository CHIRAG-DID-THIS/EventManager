public with sharing class DashboardController {

    /**
     * @description This wrapper class holds all the data needed for the dashboard page.
     */
    public class DashboardDataWrapper {
        @AuraEnabled public Userdata__c userProfile { get; set; }
        @AuraEnabled public List<Booking__c> bookings { get; set; }
    }

    /**
     * @description Fetches the Userdata__c profile and all associated Booking__c records.
     * @param userdataId The ID of the Userdata__c record.
     */
    @AuraEnabled(cacheable=true)
    public static DashboardDataWrapper getDashboardData(Id userdataId) {
        if (userdataId == null) {
            throw new AuraHandledException('Userdata ID is required.');
        }

        DashboardDataWrapper result = new DashboardDataWrapper();

        // 1. Get the user's profile directly using the provided Userdata__c ID.
        List<Userdata__c> profiles = [
            SELECT First_Name__c, Last_Name__c, Email__c, Contact_No__c, VendorName__c 
            FROM Userdata__c 
            WHERE Id = :userdataId LIMIT 1
        ];

        if (!profiles.isEmpty()) {
            result.userProfile = profiles[0];
        }

        // 2. Get all booking records linked to this Userdata__c record.
        result.bookings = [
            SELECT Id, Name, EventDate__c,Event_End_Date__c, Total_Amount__c, Status__c,
                   Package__r.Venue__r.VenueName__c, 
                   Package__r.EventComapny__r.Company_Name__c
            FROM Booking__c
            WHERE Userdata__c = :userdataId
              AND Package__c != null
              AND Package__r.Venue__c != null
              AND Package__r.EventComapny__c != null
            ORDER BY EventDate__c DESC
        ];

        return result;
    }
}