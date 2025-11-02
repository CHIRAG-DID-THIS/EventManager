/**
 * @description Apex handler class for the EventServicesMTrigger.
 * Creates the real EventServices__c record from the mask record.
 */
public with sharing class EventServicesMTriggerHandler {

    public static void handleAfterInsert(List<EventServicesM__c> newMaskRecords) {
        List<EventServices__c> servicesToCreate = new List<EventServices__c>();

        for (EventServicesM__c mask : newMaskRecords) {
            
            // Prepare the price, safely converting from Text to Decimal
            Decimal priceValue = 0;
            if (String.isNotBlank(mask.Price__c)) {
                try {
                    // This is the safest way to convert text to a number
                    priceValue = Decimal.valueOf(mask.Price__c);
                } catch (Exception e) {
                    // If the text isn't a valid number, we log an error and the price remains 0
                    System.debug('Could not parse price from text: ' + mask.Price__c);
                }
            }

            // Create the real EventServices__c record
            servicesToCreate.add(new EventServices__c(
                EventComapny__c = (Id)mask.EventComapny__c,
                Service_Type__c = mask.Service_Type__c,
                Service_SubType__c = mask.Service_SubType__c,
                Price__c = priceValue
            ));
        }

        try {
            if (!servicesToCreate.isEmpty()) {
                insert servicesToCreate;
            }
        } catch (Exception e) {
            System.debug('Error creating EventServices__c from mask: ' + e.getMessage());
        }
    }
}