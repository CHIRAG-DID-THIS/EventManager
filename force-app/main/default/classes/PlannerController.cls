public with sharing class PlannerController {

    // UPDATED: Wrapper now has separate properties for selected vs. other venues
    public class PlannerDetailResponse {
        @AuraEnabled public EventComapny__c planner;
        @AuraEnabled public Venue__c selectedVenue; // For the single selected venue
        @AuraEnabled public List<Venue__c> otherVenues; // For all other linked venues
        @AuraEnabled public List<EventServices__c> servicesOffered;
    }

    @AuraEnabled(cacheable=true)
    public static PlannerDetailResponse getPlannerDetails(Id plannerId, Id venueId) {
        PlannerDetailResponse response = new PlannerDetailResponse();

        // 1. Fetch planner info (no change)
        response.planner = [
            SELECT Id, Name, Company_Name__c, EventType__c, Userdata__r.VendorName__c, Phone__c, Address__c, City__c,About__c
            FROM EventComapny__c
            WHERE Id = :plannerId
            LIMIT 1
        ];

        // 2. Fetch the single selected venue's details
        response.selectedVenue = [
            SELECT Id, VenueName__c, Location__c, Capacity__c, Descriptions__c 
            FROM Venue__c 
            WHERE Id = :venueId 
            LIMIT 1
        ];

        // 3. Fetch all OTHER venues linked to the planner
        List<Planner_Venue__c> otherPlannerVenues = [
            SELECT Venue__r.Id, Venue__r.VenueName__c, Venue__r.Location__c, Venue__r.Capacity__c, Venue__r.Descriptions__c
            FROM Planner_Venue__c
            WHERE EventComapny__c = :plannerId AND Venue__c != :venueId // Exclude the selected one
        ];

        response.otherVenues = new List<Venue__c>();
        for(Planner_Venue__c pv : otherPlannerVenues){
            response.otherVenues.add(pv.Venue__r);
        }

        // 4. Fetch services offered by the planner (no change)
        response.servicesOffered = [
            SELECT Id, Name, Service_Type__c, Price__c, Service_SubType__c
            FROM EventServices__c
            WHERE EventComapny__c = :plannerId
            ORDER BY Service_Type__c ASC, Service_SubType__c ASC // ADDED: Order the results

        ];

        return response;
    }
}