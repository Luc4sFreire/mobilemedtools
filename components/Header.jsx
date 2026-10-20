function Header({ onSelectComponent }){
    return(
        <main>
            <button onClick={() => onSelectComponent("signature")}>Assinatura</button>
            <button onClick={() => onSelectComponent("password")}>Senha</button>
        </main>
    )
}

export default Header;