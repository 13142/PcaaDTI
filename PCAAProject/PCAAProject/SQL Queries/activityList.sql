SELECT jubileeactivities.ActivityName,members.FName, members.MName, members.LName FROM registrationinfo 
	JOIN members
		ON registrationinfo.MemberID = members.ID
	JOIN jubileeactivities
		ON jubileeactivities.id = registrationinfo.ActivityID
	