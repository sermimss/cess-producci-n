const fs = require('fs');
let code = fs.readFileSync('components/StudentReportCardModal.tsx', 'utf8');
code = code.replace(
  '          </div>\n        </div>\n      </div>\n    </div>\n  );\n};\n\nexport default StudentReportCardModal;',
  '          </div>\n          <style dangerouslySetInnerHTML={{__html: `\\n            @media print {\\n              @page { margin: 1.5cm; }\\n              body * { visibility: hidden; }\\n              .fixed { position: absolute; }\\n              .fixed * { visibility: visible; }\\n              .fixed { left: 0; top: 0; width: 100%; height: auto !important; min-height: 100%; background: white !important; overflow: visible !important; }\\n              .max-h-\\[90vh\\] { max-height: none !important; }\\n            }\\n          `}} />\n        </div>\n      </div>\n    </div>\n  );\n};\n\nexport default StudentReportCardModal;'
);
fs.writeFileSync('components/StudentReportCardModal.tsx', code);
