import axios from 'axios';
const go = async () => {
    try {
        const r = await axios.get('https://raw.githubusercontent.com/rmyndharis/OpenWA/main/readme.md');
        console.log(r.data);
    } catch (e) {
        try {
            const r2 = await axios.get('https://raw.githubusercontent.com/rmyndharis/OpenWA/main/README.md');
            console.log(r2.data);
        } catch (e2) {
            console.log("failed");
        }
    }
}
go();
