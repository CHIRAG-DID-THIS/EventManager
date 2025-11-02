public with sharing class EventRequestController {


    // UPDATED: This method is now dynamic
    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getEventTypeOptions() {
        List<Map<String, String>> options = new List<Map<String, String>>();
        
        // 1. Get the describe result for the EventType__c field on the EventComapny__c object
        Schema.DescribeFieldResult fieldResult = EventComapny__c.EventType__c.getDescribe();
        
        // 2. Get the list of picklist values
        List<Schema.PicklistEntry> ple = fieldResult.getPicklistValues();

        // 3. Create a map of label/value for each picklist entry
        for (Schema.PicklistEntry f : ple) {
            options.add(new Map<String, String>{'label' => f.getLabel(), 'value' => f.getValue()});
        }
        return options;
    }

    @AuraEnabled
    public static Id createEventRequest(String userId, String eventDataJSON) {
        if (String.isBlank(userId)) { throw new AuraHandledException('User ID is missing.'); }
        if (String.isBlank(eventDataJSON)) { throw new AuraHandledException('Event data is missing.'); }

        try {
            Map<String, Object> eventData = (Map<String, Object>) JSON.deserializeUntyped(eventDataJSON);
            EventRequest__c newEvent = new EventRequest__c();
            
            newEvent.Userdata__c = Id.valueOf(userId); 
            newEvent.EventType__c = (String)eventData.get('eventType');
            newEvent.Location__c = (String)eventData.get('location');
            newEvent.Description__c = (String)eventData.get('description');

            if (eventData.get('startDate') != null) { newEvent.StartDate__c = Date.valueOf((String)eventData.get('startDate')); }
            if (eventData.get('endDate') != null) { newEvent.EndDate__c = Date.valueOf((String)eventData.get('endDate')); }
            if (eventData.get('guestCount') != null) { newEvent.No_Of_Guest__c = Integer.valueOf(String.valueOf(eventData.get('guestCount'))); }
            if (eventData.get('budget') != null) { newEvent.Budget__c = Decimal.valueOf(String.valueOf(eventData.get('budget'))); }
            
            newEvent.Requested_Service__c = (String)eventData.get('servicesJson');
            insert newEvent;
            return newEvent.Id;
        } catch (Exception e) {
            throw new AuraHandledException('An error occurred while creating the event request: ' + e.getMessage());
        }
    }

    public class FlowResult {
        @AuraEnabled public String packageId;
        @AuraEnabled public String status;
    }

    @AuraEnabled
    public static FlowResult runPackageCuration(Id eventRequestId) {
        if (eventRequestId == null) {
            throw new AuraHandledException('Event Request Id is required to run the flow.');
        }
        try {
            Map<String, Object> inputVars = new Map<String, Object>();
            inputVars.put('eventRequestId', eventRequestId);

            Flow.Interview interview = Flow.Interview.createInterview('Package_Curation', inputVars);
            interview.start();

            FlowResult result = new FlowResult();
            Object pidsVar = interview.getVariableValue('packageid');
            if (pidsVar == null) pidsVar = interview.getVariableValue('packageId');

            if (pidsVar != null) {
                result.packageId = String.valueOf(pidsVar);
            } else {
                result.packageId = null;
            }

            Object statusObj = interview.getVariableValue('status');
            if (statusObj != null) { result.status = String.valueOf(statusObj); }

            return result;
        } catch (Exception e) {
            throw new AuraHandledException('Failed to run package curation flow: ' + e.getMessage());
        }
    }
}