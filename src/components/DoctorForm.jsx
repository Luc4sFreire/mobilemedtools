const professionTypes = [
  { value: 'doctor', label: 'Médico', register: 'CRM' },
  { value: 'vet', label: 'Veterinário', register: 'CRMV' },
  { value: 'dentist', label: 'Dentista', register: 'CRO' },
];


// Edita um perfil profissional e mantém suas opções independentes do outro perfil.
function DoctorForm({ signatureIndex, professional, onChange }) {
  const suffix = signatureIndex + 1;
  const registerLabel = professionTypes.find((item) => item.value === professional.type)?.register ?? 'CRM';
  const rqePlaceholder = professional.compactRqe
    ? 'Digite "RS 40499" (sem barra) → "RQE/RS 40499"'
    : 'Digite "40499/SP" → "RQE: 40499/SP"';
  const crmTypes = [
    { value: 'default', label: 'Padrão', placeholder: `Digite "12345/SP" → "${registerLabel}: 12345/SP`},
    { value: 'compact', label: 'Compacto', placeholder: `Digite "RS 45534" (sem barra) → "${registerLabel}/RS 45534"` },
  ];

  return (
    <div className="doctorForm">
      {/* A categoria selecionada determina o rótulo CRM, CRMV ou CRO do registro. */}
      <div className="professional-types" role="group" aria-label={`Tipo do profissional ${suffix}`}>
        {professionTypes.map(({ value, label }) => (
          <button
            aria-pressed={professional.type === value}
            className={professional.type === value ? 'type-button selected' : 'type-button'}
            key={value}
            onClick={() => onChange('type', value)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Mantém o nome controlado pelo hook para atualização da prévia e do arquivo. */}
      <label className="form-field" htmlFor={`professional-name-${suffix}`}>
        <span>Nome do profissional</span>
        <input
          autoComplete="name"
          id={`professional-name-${suffix}`}
          onChange={(event) => onChange('name', event.target.value)}
          placeholder="Ex: Dr. João Silva"
          type="text"
          value={professional.name}
        />
      </label>

      {/* O placeholder e o formato do registro acompanham os botões padrão/compacto abaixo. */}
      <label className="form-field" htmlFor={`professional-registration-${suffix}`}>
        <span>{registerLabel} com Estado</span>
        <input
          id={`professional-registration-${suffix}`}
          onChange={(event) => onChange('registration', event.target.value)}
          placeholder={crmTypes.find((item) => item.value === professional.crmType)?.placeholder}
          type="text"
          value={professional.registration}
        />
      </label>
      <label className="inline-option">
        {/* O formato selecionado também controla a saída usada na assinatura. */}
        {crmTypes.map(({ value, label }) => (
          <button
            aria-pressed={professional.crmType === value}
            className={professional.crmType === value ? 'type-button selected' : 'type-button'}
            key={value}
            onClick={() => {
              onChange('crmType', value);
              onChange('compactRegistration', value === 'compact');
            }}
            type="button"
          >
            {label}
          </button>
        ))}
      </label>

      {/* Mantém o RQE opcional e só mostra sua entrada quando o usuário o habilita. */}
      <label className="inline-option">
        <input
          checked={professional.includeRqe}
          onChange={(event) => onChange('includeRqe', event.target.checked)}
          type="checkbox"
        />
        <span>Adicionar RQE</span>
      </label>
      {professional.includeRqe && (
        <>
          <label className="form-field" htmlFor={`professional-rqe-${suffix}`}>
            <span>Registro de qualificação de especialista (RQE)</span>
            <input
              id={`professional-rqe-${suffix}`}
              onChange={(event) => onChange('rqe', event.target.value)}
              placeholder={rqePlaceholder}
              type="text"
              value={professional.rqe}
            />
          </label>
          {/* O formato muda o placeholder e o prefixo usado no RQE exportado. */}
          <div className="inline-option" role="group" aria-label={`Formato do RQE ${suffix}`}>
            {crmTypes.map(({ value, label }) => (
              <button
                aria-pressed={professional.compactRqe === (value === 'compact')}
                className={professional.compactRqe === (value === 'compact') ? 'type-button selected' : 'type-button'}
                key={`rqe-${value}`}
                onClick={() => onChange('compactRqe', value === 'compact')}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default DoctorForm;