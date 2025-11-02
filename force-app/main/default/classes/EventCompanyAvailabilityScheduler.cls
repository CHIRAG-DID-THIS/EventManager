public class EventCompanyAvailabilityScheduler implements Schedulable {
    public void execute(SchedulableContext sc) {
        EventCompanyAvailabilityChecker.updateEventCompanyAvailability();
    }
}