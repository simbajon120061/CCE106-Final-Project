                 onChangeText={(value) =>
                   setPhoneNumber(
                     normalizePhoneNumber(value).slice(0, 11)
                   )
                 }
                 keyboardType="phone-pad"
                 placeholder="09XXXXXXXXX"
                 placeholderTextColor={
                   colors.textMuted
                 }
                 maxLength={11}
