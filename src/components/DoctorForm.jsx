function DoctorForm({ doctor, crm, onDoctorChange, onCrmChange }){
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
                <label htmlFor="crm">Nome do Profissional (com título)</label>
                <input
                    id="crm"
                    type="text"
                    placeholder="Ex: CRM 12345/SP"
                    onChange={onCrmChange}
                    value={crm}
                />
            </div>
        </div>
    )
}

export default DoctorForm;