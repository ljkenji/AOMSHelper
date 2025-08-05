// ==UserScript==
// @name         AOMS Helper
// @author       Lj Kenji
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Chèn HTML có input và nút Paste vào trang AwbDetail, tích hợp check digit, F4 để tìm kiếm
// @match        https://*/*/AwbDetail/Index*
// @match        https://*/*/AWBDetail/Index*
// @grant        GM_setClipboard
// @grant        GM_getClipboard
// ==/UserScript==

(function () {
    'use strict';

    function waitForjQuery(callback) {
        if (typeof window.jQuery !== 'undefined') {
            callback(window.jQuery);
        } else {
            setTimeout(() => waitForjQuery(callback), 200);
        }
    }

    function insertHTML($) {
        const $target = $("#mawb-prefix").parent().parent().parent();

        if ($target.length) {
            const html = `
                <div class="justify-content-center row align-items-center">
                    <div class="col-md-2">
                        <label style="color: red; font-weight: bold;">FULL AWB</label>
                    </div>
                    <div class="col-md-4 d-flex">
                        <input type="text" id="full-awb" class="form-control" style="margin-right: 15px;">
                        <button id="paste-awb" class="btn btn-secondary" title="Paste từ clipboard">
                            Paste
                        </button>
                    </div>
                </div>
                <div class="mb-4 justify-content-center row align-items-center">
                    <div class="col-md-6">
                        <div id="checkdigit-result" style="margin-top: 5px; font-weight: bold;"></div>
                    </div>
                </div>
            `;
            $target.prepend(html);

            $("#paste-awb").on("click", async function () {
                try {
                    const text = await navigator.clipboard.readText();
                    $("#full-awb").val(text);
                    handleAWBInput(text);
                } catch (err) {
                    alert("Không thể truy cập clipboard. Hãy kiểm tra quyền trình duyệt.");
                    console.error("Clipboard error:", err);
                }
            });

            $("#full-awb").on("input", function () {
                handleAWBInput(this.value);
            });
        } else {
            console.warn("Không tìm thấy phần tử cha từ #mawb-prefix.");
        }
    }

    function handleAWBInput(fullAwb) {
        splitAndFillAWB(fullAwb);
        checkDigitValidate(fullAwb);
    }

    function splitAndFillAWB(fullAwb) {
        if (!fullAwb) return;

        const cleaned = fullAwb.replace(/-/g, '').trim();

        if (cleaned.length < 4) {
            console.warn('FULL AWB không hợp lệ:', fullAwb);
            return;
        }

        const prefix = cleaned.slice(0, 3);
        let serial = cleaned.slice(3);
        serial = serial.replace(/^0+/, '') || '0';

        $('#mawb-prefix').val(prefix);
        $('#mawb-serial').val(serial);
    }

    function checkDigitValidate(fullAwb) {
        const resultDiv = document.getElementById("checkdigit-result");
        const input = document.getElementById("full-awb");
        const awbCheck = new AWBCheckDigit(fullAwb);

        if (!awbCheck.format_match()) {
            resultDiv.textContent = "❌ Định dạng không hợp lệ";
            resultDiv.style.color = "orange";
            input.classList.remove("valid", "invalid");
            return;
        }

        if (awbCheck.valid()) {
            resultDiv.textContent = "✅ Check digit hợp lệ";
            resultDiv.style.color = "green";
            input.classList.add("valid");
            input.classList.remove("invalid");
        } else if (awbCheck.invalid()) {
            resultDiv.textContent = "❌ Check digit không đúng (dự kiến: " + awbCheck.calculated() + ")";
            resultDiv.style.color = "red";
            input.classList.add("invalid");
            input.classList.remove("valid");
        } else {
            resultDiv.textContent = "";
            input.classList.remove("valid", "invalid");
        }
    }

    function AWBCheckDigit(t) {
        this.number = t.toUpperCase();
        this.templates = ["12312345678", "123-12345678"];
        this.match_with = /^[0-9]{3}(-?)[0-9]{8}$/i;
        this.match_without = /^[0-9]{3}(-?)[0-9]{7}$/i;
    }

    AWBCheckDigit.prototype.calculated = function () {
        if (this.calculated_memo !== undefined) return this.calculated_memo;
        let t = "";
        if (this.match_with.test(this.number) || this.match_without.test(this.number)) {
            t = this.number.replace("-", "").substring(3, 10) % 7;
        }
        this.calculated_memo = t.toString();
        return this.calculated_memo;
    };

    AWBCheckDigit.prototype.number_with_checkdigit = function () {
        return this.match_without.test(this.number) ? this.number + this.calculated() : "";
    };

    AWBCheckDigit.prototype.valid = function () {
        return this.match_with.test(this.number) && this.calculated() === this.number.slice(-1);
    };

    AWBCheckDigit.prototype.invalid = function () {
        return this.match_with.test(this.number) && this.calculated() !== this.number.slice(-1);
    };

    AWBCheckDigit.prototype.format_match = function () {
        return this.match_with.test(this.number) || this.match_without.test(this.number);
    };

    AWBCheckDigit.prototype.format_valid = function () {
        if (this.format_valid_memo !== undefined) return this.format_valid_memo;
        let t = false;
        const e = this.number;
        const i = this.match_with;
        this.templates.forEach(function (n) {
            if (i.test(e + n.substr(e.length))) {
                t = true;
            }
        });
        this.format_valid_memo = t;
        return this.format_valid_memo;
    };

    window.addEventListener('load', () => {
        waitForjQuery(($) => {
            insertHTML($);
        });
                // Đổi nội dung nút
        const span = document.querySelector('#btnSearch span');
        if (span && !span.textContent.includes('(F4)')) {
            span.textContent = span.textContent.trim() + ' (F4)';
        }

        // Lắng nghe phím F4
        document.addEventListener('keydown', function (e) {
            if (e.key === 'F4') {
                e.preventDefault(); // Ngăn hành vi mặc định
                if (typeof CheckExistAwb === 'function') {
                    CheckExistAwb();
                } else {
                    console.warn('Hàm CheckExistAwb chưa được định nghĩa.');
                }
            }
        });
    });
})();
