SELECT group_concat(tblC.ActivityName SEPARATOR ',') AS 'Activities',members.FName, members.LName FROM registrationinfo tblA 
	JOIN members tblB 
		ON registrationinfo.MemberID = members.ID 
	JOIN jubileeactivities tblC 
		ON tblC.ID = tblA.ActivityID 
	GROUP BY registrationinfo.MemberID;