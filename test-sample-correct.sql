-- Correct SQL file following all DBA rules

USE MyDatabase;

-- Proper three-part naming and no violations
SELECT u.Id, u.Name, u.Email
FROM MyDatabase.dbo.Users u
WHERE u.IsActive = 1;

-- Using IN instead of OR
SELECT p.Id, p.Title
FROM MyDatabase.dbo.Posts p
WHERE p.Status IN ('Active', 'Pending');

-- No ORDER BY, results unordered
INSERT INTO MyDatabase.dbo.AuditLog (Action, UserId, Timestamp)
SELECT 
    'LOGIN' AS Action,
    u.Id AS UserId,
    GETDATE() AS Timestamp
FROM MyDatabase.dbo.Users u
WHERE u.LastLoginDate < DATEADD(day, -30, GETDATE());
