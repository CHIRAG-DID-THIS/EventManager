trigger welcomemailtrigger on Userdata__c (after insert) {
    for (Userdata__c userData : Trigger.new) {
        mailingclass.sendWelcomeEmail(userData.Id);
    }
}