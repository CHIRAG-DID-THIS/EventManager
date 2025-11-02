/**
 * @description Trigger on the EventServicesM__c mask object to process new records
 * and create the actual EventServices__c records with the master-detail relationship.
 */
trigger EventServicesMTrigger on EventServicesM__c (after insert) {
    if (Trigger.isAfter && Trigger.isInsert) {
        EventServicesMTriggerHandler.handleAfterInsert(Trigger.new);
    }
}