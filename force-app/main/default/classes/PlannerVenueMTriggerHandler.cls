/**
 * @description Apex handler class for the PlannerVenueMTrigger.
 * Contains logic to create the real Planner_Venue__c record from the mask record.
 */
public with sharing class PlannerVenueMTriggerHandler {

    public static void handleAfterInsert(List<Planner_VenueM__c> newMaskRecords) {
        List<Planner_Venue__c> venuesToCreate = new List<Planner_Venue__c>();
        List<Planner_VenueM__c> masksToUpdate = new List<Planner_VenueM__c>();

        for (Planner_VenueM__c mask : newMaskRecords) {
            // Only process records that have not been processed before
            if (
                String.isNotBlank(mask.EventComapny__c) && 
                String.isNotBlank(mask.Venue__c)) {
                
                // Create the real Planner_Venue__c record
                venuesToCreate.add(new Planner_Venue__c(
                    EventComapny__c = (Id)mask.EventComapny__c,
                    Venue__c = (Id)mask.Venue__c,
                    Price__c = mask.Price__c
                ));

                // Mark the mask record as processed to prevent re-processing
                masksToUpdate.add(mask);
            }
        }

        try {
            if (!venuesToCreate.isEmpty()) {
                insert venuesToCreate;
            }
            if (!masksToUpdate.isEmpty()) {
                // Update the mask records without firing this trigger again
                update masksToUpdate;
            }
        } catch (Exception e) {
            // In a production environment, you would want to handle this error,
            // for example, by logging it or updating the mask record with an error message.
            System.debug('Error creating Planner_Venue__c from mask: ' + e.getMessage());
        }
    }
}