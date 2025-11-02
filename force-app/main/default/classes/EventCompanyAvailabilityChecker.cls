public class EventCompanyAvailabilityChecker {
    public static void updateEventCompanyAvailability() {
        // Step 1: Get all PlannerVenue__c records
        List<Planner_Venue__c> plannerVenueList = [
            SELECT EventComapny__c, Venue__r.Unavailable__c
            FROM Planner_Venue__c
            WHERE EventComapny__c != null AND Venue__c != null
        ];

        // Step 2: Map EventCompany to list of venue availability
        Map<Id, List<Boolean>> eventCompanyVenueStatusMap = new Map<Id, List<Boolean>>();

        for (Planner_Venue__c pv : plannerVenueList) {
            if (!eventCompanyVenueStatusMap.containsKey(pv.EventComapny__c)) {
                eventCompanyVenueStatusMap.put(pv.EventComapny__c, new List<Boolean>());
            }
            eventCompanyVenueStatusMap.get(pv.EventComapny__c).add(pv.Venue__r.Unavailable__c);
        }

        // Step 3: Prepare list of EventCompany__c to update
        List<EventComapny__c> companiesToUpdate = new List<EventComapny__c>();

        for (Id companyId : eventCompanyVenueStatusMap.keySet()) {
            List<Boolean> statuses = eventCompanyVenueStatusMap.get(companyId);
            Boolean allUnavailable = statuses.size() > 0 && !statuses.contains(false); // all true

            companiesToUpdate.add(new EventComapny__c(
                Id = companyId,
                Unavailable__c = allUnavailable
            ));
        }

        if (!companiesToUpdate.isEmpty()) {
            update companiesToUpdate;
        }
    }
}