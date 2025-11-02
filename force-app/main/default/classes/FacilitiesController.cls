public with sharing class FacilitiesController {

    @AuraEnabled(cacheable=true)
    public static List<EventServices__c> getServiceDefinitions(String eventCompanyId) {
        if(String.isBlank(eventCompanyId)) {
            return new List<EventServices__c>();
        }
        try {
            return [
                SELECT Id, Name, Service_Type__c, Service_SubType__c, Price__c 
                FROM EventServices__c 
                WHERE EventComapny__c = :eventCompanyId 
                ORDER BY Service_Type__c, Service_SubType__c
            ];
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    public class ServiceWrapper {
        @AuraEnabled public String serviceId {get;set;}
        @AuraEnabled public String serviceName {get;set;}
        @AuraEnabled public String serviceType {get;set;}
        @AuraEnabled public String serviceSubType {get;set;}
        @AuraEnabled public Decimal pricePerUnit {get;set;}
        @AuraEnabled public Integer units {get;set;}
    }

    /**
     * @description UPDATED: Receives services and DATES, builds a flat JSON list, 
     * creates a new Package__c record, and returns the new record's ID.
     */
    @AuraEnabled
    public static Id savePackageDetails(
        String eventCompanyId, 
        String venueId, 
        List<ServiceWrapper> selectedServices,
        Date startDate,
        Date endDate 
    ) {
        if (selectedServices == null || selectedServices.isEmpty()) {
            throw new AuraHandledException('No services were selected.');
        }
        
        List<Map<String, Object>> servicesToStore = new List<Map<String, Object>>();
        Decimal grandTotalCost = 0;

        for (ServiceWrapper service : selectedServices) {
            // UPDATED: Added a check to ensure pricePerUnit is not null
            if (service.units != null && service.units > 0 && service.pricePerUnit != null) {
                Decimal lineItemTotal = service.pricePerUnit * service.units;
                grandTotalCost += lineItemTotal;
                
                Map<String, Object> detail = new Map<String, Object>();
                detail.put('serviceType', service.serviceType);
                detail.put('serviceSubType', service.serviceSubType);
                detail.put('units', service.units);
                detail.put('pricePerUnit', service.pricePerUnit);
                detail.put('total', lineItemTotal);
                
                servicesToStore.add(detail);
            }
        }

        if(servicesToStore.isEmpty()){
             throw new AuraHandledException('Please select a quantity greater than zero for at least one service.');
        }

        Package__c newPackage = new Package__c(
            EventComapny__c = eventCompanyId,
            Venue__c = venueId,
            Services__c = JSON.serialize(servicesToStore),
            TotalCost__c = grandTotalCost,
            EventServices__c = selectedServices[0].serviceId,
            StartDate__c = startDate,
            EndDate__c = endDate
        );

        try {
            insert newPackage;
            return newPackage.Id;
        } catch (Exception e) {
            throw new AuraHandledException('Error inserting Package record: ' + e.getMessage());
        }
    }
}