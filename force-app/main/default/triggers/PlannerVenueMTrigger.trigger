/**
 * @description Trigger on the Planner_VenueM__c mask object to process new records
 * and create the actual Planner_Venue__c records with master-detail relationships.
 */
trigger PlannerVenueMTrigger on Planner_VenueM__c (after insert) {
    if (Trigger.isAfter && Trigger.isInsert) {
        PlannerVenueMTriggerHandler.handleAfterInsert(Trigger.new);
    }
}