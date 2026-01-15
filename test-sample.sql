/*
Example SQL file with DBA violations for testing
USE MyDatabase FROM myTable 
*/

SELECT COUNT(*)
FROM Users
WHERE Status = 'Active' OR Status = 'Pending'
ORDER BY CreatedDate DESC;
