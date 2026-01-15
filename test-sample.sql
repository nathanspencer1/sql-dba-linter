/*
Example SQL file with DBA violations for testing
*/
USE MyDatabase

-- VIOLATION: Missing USE statement at the beginning

SELECT * FROM Users WHERE Status = 'Active' OR Status = 'Pending'  -- VIOLATION: OR operator
ORDER BY CreatedDate DESC;  -- VIOLATION: ORDER BY clause

-- VIOLATION: Two-part naming instead of three-part
SELECT u.Id, u.Name
FROM dbo.Users u  -- Should be Database.dbo.Users
WHERE u.IsActive = 1;

-- CORRECT: Three-part naming
SELECT u.Id, u.Name
FROM MyDatabase.dbo.Users u
WHERE u.IsActive = 1;
