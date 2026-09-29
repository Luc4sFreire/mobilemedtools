function DoctorForm({ type, doctor, crm, onDoctorChange, onCrmChange }){
    let text = "";
    switch(type){
        case "doctor":
            text = "CRM";
            break;
        case "vet":
            text = "CRMV";
            break;
        case "dentist":
            text = "CRO";
            break;
    }
    return(
        <div className="doctorForm">
            <div className="doctor">
                <label htmlFor="doctor">Nome do Profissional (com título)</label>
                <input
                    id="doctor"
                    type="text"
                    placeholder="Ex: Dr. João Silva"
                    onChange={onDoctorChange}
                    value={doctor}
                />
            </div>
            <div className="crm">
                <label htmlFor="crm">{text} com Estado:</label>
                <input
                    id="crm"
                    type="text"
                    placeholder={"Ex: "+text+" 12345/SP"}
                    onChange={onCrmChange}
                    value={crm}
                />
            </div>
        </div>
    )
}

export default DoctorForm;