public class Package_Generation_Catalog {
    @InvocableMethod(label='Generate Event Catalog')
    public static List<String> generateCatalog(List<String> jsonInputs) {
        List<String> results = new List<String>();
        
        for (String jsonInput : jsonInputs) {
            // Step 1: Parse locations
            Map<String, Object> parsedInput = (Map<String, Object>) JSON.deserializeUntyped(jsonInput);
            List<Object> locationsObj = (List<Object>) parsedInput.get('validLocations');
            List<String> locationList = new List<String>();
            for (Object loc : locationsObj) {
                locationList.add((String) loc);
            }
            
            // Step 2: Query all Venues with these locations
            List<Venue__c> venues = [SELECT Id, Name, VenueName__c, Capacity__c, Unavailable__c, Location__c
                                     FROM Venue__c
                                     WHERE Location__c IN :locationList];
            Set<Id> venueIds = new Set<Id>();
            for (Venue__c v : venues) venueIds.add(v.Id);
            
            // Step 3: Get Planner_Venue records associated with these venues
            List<Planner_Venue__c> plannerVenues = [SELECT Id, EventComapny__c, Venue__c, Price__c,
                                                    Venue__r.Id, Venue__r.Name, Venue__r.Location__c,
                                                    Venue__r.VenueName__c, Venue__r.Capacity__c, Venue__r.Unavailable__c
                                                    FROM Planner_Venue__c
                                                    WHERE Venue__c IN :venueIds];
            Set<Id> eventCompanyIds = new Set<Id>();
            for (Planner_Venue__c pv : plannerVenues) eventCompanyIds.add(pv.EventComapny__c);
            
            // Step 4: Query EventCompanies and their Services
            List<EventComapny__c> companies = [SELECT Id, Name, Company_Name__c, EventType__c, City__c, Address__c, About__c, Unavailable__c, Owner_User__c
                                               FROM EventComapny__c
                                               WHERE Id IN :eventCompanyIds];
            
            List<EventServices__c> allServices = [SELECT Id, Name, EventComapny__c, Price__c, Service_Type__c, Service_SubType__c
                                                  FROM EventServices__c
                                                  WHERE EventComapny__c IN :eventCompanyIds];
            
            // Step 5: Build catalog JSON with Venues and Services inside EventCompany
            List<Map<String, Object>> catalog = new List<Map<String, Object>>();
            
            for (EventComapny__c ec : companies) {
                // Create EventCompany map
                Map<String, Object> companyFields = new Map<String, Object>();
                companyFields.put('Id', ec.Id);
                companyFields.put('Name', ec.Name);
                companyFields.put('Company_Name', ec.Company_Name__c);
                companyFields.put('EventType', ec.EventType__c);
                companyFields.put('City', ec.City__c);
                companyFields.put('Address', ec.Address__c);
                companyFields.put('About', ec.About__c);
                companyFields.put('Unavailable', ec.Unavailable__c);
                companyFields.put('Owner_User', ec.Owner_User__c);
                
                // Add Venues inside companyFields
                List<Map<String, Object>> venueList = new List<Map<String, Object>>();
                for (Planner_Venue__c pv : plannerVenues) {
                    if (pv.EventComapny__c == ec.Id) {
                        Map<String, Object> vMap = new Map<String, Object>();
                        Map<String, Object> venueFields = new Map<String, Object>();

                        if (pv.Venue__r != null) {
                            venueFields.put('Id', pv.Venue__r.Id);
                            venueFields.put('Name', pv.Venue__r.Name);
                            venueFields.put('VenueName', pv.Venue__r.VenueName__c);
                            venueFields.put('Capacity', pv.Venue__r.Capacity__c);
                            venueFields.put('Unavailable', pv.Venue__r.Unavailable__c);
                            venueFields.put('Location', pv.Venue__r.Location__c);
                        }

                        // Add Planner_Venue price
                        venueFields.put('Price', pv.Price__c);

                        vMap.put('PlannerVenueId', pv.Id);
                        vMap.put('Venue', venueFields);
                        venueList.add(vMap);
                    }
                }
                companyFields.put('Venues', venueList);
                
                // Add Services inside companyFields
                List<Map<String, Object>> serviceList = new List<Map<String, Object>>();
                for (EventServices__c es : allServices) {
                    if (es.EventComapny__c == ec.Id) {
                        Map<String, Object> sMap = new Map<String, Object>();
                        sMap.put('Id', es.Id);
                        sMap.put('Name', es.Name);
                        sMap.put('Service_Type', es.Service_Type__c);
                        sMap.put('Service_SubType', es.Service_SubType__c);
                        sMap.put('Price', es.Price__c);
                        serviceList.add(sMap);
                    }
                }
                companyFields.put('Services', serviceList);
                
                // Wrap the companyFields map inside top-level EventCompany key
                Map<String, Object> entry = new Map<String, Object>();
                entry.put('EventCompany', companyFields);
                
                catalog.add(entry);
            }
            
            results.add(JSON.serializePretty(catalog));
        }
        
        return results;
    }
}