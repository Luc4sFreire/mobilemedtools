const professionTypes = [
  { value: 'doctor', label: 'Médico', register: 'CRM' },
  { value: 'vet', label: 'Veterinário', register: 'CRMV' },
  { value: 'dentist', label: 'Dentista', register: 'CRO' },
];


// Formulário acessível e controlado para um dos profissionais da composição.
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
      {/* A categoria define a sigla usada no campo e na identificação exportada. */}
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

      {/* Nome é armazenado no perfil correspondente pelo hook. */}
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

      {/* A opção compacta altera apenas a apresentação do registro. */}
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

      {/* RQE só entra na composição quando o usuário ativa o campo. */}
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